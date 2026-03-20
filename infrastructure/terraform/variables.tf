variable "aws_region" {
  description = "AWS region to deploy to"
  type        = string
  default     = "us-east-1" # Change to your preferred region
}

variable "aws_profile" {
  description = "AWS CLI profile to use"
  type        = string
  default     = "default"
}

variable "db_name" {
  description = "Database name"
  type        = string
  default     = "virnyx"
  sensitive   = true
}

variable "db_username" {
  description = "Database username"
  type        = string
  default     = "virnyx_admin"
  sensitive   = true
}

variable "allowed_ssh_cidr" {
  description = "CIDR block allowed for SSH access"
  type        = list(string)
  default     = ["0.0.0.0/0"] # ⚠️ Change this to your IP for security: ["YOUR_IP/32"]
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "prod"
}

variable "app_name" {
  description = "Application name"
  type        = string
  default     = "virnyx"
}
