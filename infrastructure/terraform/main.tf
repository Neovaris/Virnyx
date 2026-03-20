# AWS Provider Configuration
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# VPC
resource "aws_vpc" "virnyx" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "virnyx-vpc"
  }
}

# Public Subnet
resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.virnyx.id
  cidr_block              = "10.0.1.0/24"
  availability_zone       = data.aws_availability_zones.available.names[0]
  map_public_ip_on_launch = true

  tags = {
    Name = "virnyx-public-subnet"
  }
}

# Internet Gateway
resource "aws_internet_gateway" "virnyx" {
  vpc_id = aws_vpc.virnyx.id

  tags = {
    Name = "virnyx-igw"
  }
}

# Route Table
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.virnyx.id

  route {
    cidr_block      = "0.0.0.0/0"
    gateway_id      = aws_internet_gateway.virnyx.id
  }

  tags = {
    Name = "virnyx-public-rt"
  }
}

resource "aws_route_table_association" "public" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}

# Security Group for EC2 (Virnyx API & Nginx)
resource "aws_security_group" "virnyx_ec2" {
  name        = "virnyx-ec2-sg"
  description = "Security group for Virnyx EC2 instance"
  vpc_id      = aws_vpc.virnyx.id

  # Allow SSH
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = var.allowed_ssh_cidr
  }

  # Allow HTTP
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Allow HTTPS
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Allow all outbound
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "virnyx-ec2-sg"
  }
}

# Security Group for RDS
resource "aws_security_group" "virnyx_rds" {
  name        = "virnyx-rds-sg"
  description = "Security group for Virnyx RDS"
  vpc_id      = aws_vpc.virnyx.id

  # Allow PostgreSQL from EC2
  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.virnyx_ec2.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "virnyx-rds-sg"
  }
}

# RDS Subnet Group
resource "aws_db_subnet_group" "virnyx" {
  name       = "virnyx-db-subnet-group"
  subnet_ids = [aws_subnet.public.id, aws_subnet.private.id]

  tags = {
    Name = "virnyx-db-subnet-group"
  }
}

# Private Subnet for RDS
resource "aws_subnet" "private" {
  vpc_id            = aws_vpc.virnyx.id
  cidr_block        = "10.0.2.0/24"
  availability_zone = data.aws_availability_zones.available.names[1]

  tags = {
    Name = "virnyx-private-subnet"
  }
}

# RDS PostgreSQL Database (Free Tier: db.t2.micro, 20GB storage)
resource "aws_db_instance" "virnyx" {
  identifier     = "virnyx-postgres"
  engine         = "postgres"
  engine_version = "15.3"
  instance_class = "db.t2.micro" # Free tier eligible

  allocated_storage    = 20  # Free tier: up to 20GB
  max_allocated_storage = 20 # Prevent auto-scaling during free tier period

  db_name  = var.db_name
  username = var.db_username
  password = random_password.db_password.result

  db_subnet_group_name   = aws_db_subnet_group.virnyx.name
  publicly_accessible    = false
  skip_final_snapshot    = false
  final_snapshot_identifier = "virnyx-postgres-final-snapshot-${formatdate("YYYY-MM-DD-hhmm", timestamp())}"

  vpc_security_group_ids  = [aws_security_group.virnyx_rds.id]
  backup_retention_period = 7
  backup_window           = "03:00-04:00"
  maintenance_window      = "mon:04:00-mon:05:00"

  tags = {
    Name = "virnyx-postgres"
  }

  depends_on = [aws_security_group.virnyx_rds]
}

# Random password for RDS
resource "random_password" "db_password" {
  length  = 32
  special = true
}

# EC2 Instance (Free Tier: t2.micro)
resource "aws_instance" "virnyx" {
  ami                    = data.aws_ami.amazon_linux_2.id
  instance_type          = "t2.micro" # Free tier eligible
  subnet_id              = aws_subnet.public.id
  vpc_security_group_ids = [aws_security_group.virnyx_ec2.id]
  key_name               = aws_key_pair.deployer.key_name

  iam_instance_profile = aws_iam_instance_profile.virnyx_ec2.name

  # User data script to install Docker and Docker Compose
  user_data = base64encode(templatefile("${path.module}/user_data.sh", {
    db_host     = aws_db_instance.virnyx.address
    db_port     = aws_db_instance.virnyx.port
    db_name     = var.db_name
    db_username = var.db_username
    db_password = random_password.db_password.result
  }))

  tags = {
    Name = "virnyx-ec2"
  }

  depends_on = [aws_db_instance.virnyx]
}

# Elastic IP for EC2
resource "aws_eip" "virnyx" {
  instance = aws_instance.virnyx.id
  domain   = "vpc"

  tags = {
    Name = "virnyx-eip"
  }

  depends_on = [aws_internet_gateway.virnyx]
}

# IAM Role for EC2 (to push Docker images to ECR, write to S3)
resource "aws_iam_role" "virnyx_ec2" {
  name = "virnyx-ec2-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ec2_ssm" {
  role       = aws_iam_role.virnyx_ec2.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_instance_profile" "virnyx_ec2" {
  name = "virnyx-ec2-profile"
  role = aws_iam_role.virnyx_ec2.name
}

# Data source for availability zones
data "aws_availability_zones" "available" {
  state = "available"
}

# Data source for Amazon Linux 2 AMI
data "aws_ami" "amazon_linux_2" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["amzn2-ami-hvm-*-x86_64-gp2"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# TLS Private Key for SSH access
resource "tls_private_key" "deployer" {
  algorithm = "RSA"
  rsa_bits  = 4096
}

# AWS Key Pair
resource "aws_key_pair" "deployer" {
  key_name   = "virnyx-deployer-key"
  public_key = tls_private_key.deployer.public_key_openssh

  tags = {
    Name = "virnyx-deployer-key"
  }
}

# Store private key locally
resource "local_file" "deployer_private_key" {
  content         = tls_private_key.deployer.private_key_pem
  filename        = "${path.module}/virnyx-deployer-key.pem"
  file_permission = "0600"
}

# CloudWatch Log Group
resource "aws_cloudwatch_log_group" "virnyx" {
  name              = "/virnyx/docker"
  retention_in_days = 7

  tags = {
    Name = "virnyx-logs"
  }
}

# Outputs
output "ec2_public_ip" {
  value       = aws_eip.virnyx.public_ip
  description = "Public IP of Virnyx EC2 instance"
}

output "ec2_public_dns" {
  value       = aws_instance.virnyx.public_dns
  description = "Public DNS of Virnyx EC2 instance"
}

output "rds_endpoint" {
  value       = aws_db_instance.virnyx.endpoint
  description = "RDS PostgreSQL endpoint"
  sensitive   = true
}

output "rds_address" {
  value       = aws_db_instance.virnyx.address
  description = "RDS PostgreSQL address"
}

output "db_password" {
  value       = random_password.db_password.result
  description = "RDS database password"
  sensitive   = true
}

output "ssh_key_path" {
  value       = local_file.deployer_private_key.filename
  description = "Path to SSH private key"
}

output "db_connection_string" {
  value       = "postgresql://${var.db_username}:${random_password.db_password.result}@${aws_db_instance.virnyx.address}:${aws_db_instance.virnyx.port}/${var.db_name}"
  description = "Full database connection string"
  sensitive   = true
}
