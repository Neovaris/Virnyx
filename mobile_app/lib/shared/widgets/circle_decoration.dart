import 'package:flutter/material.dart';
import '../../core/constants/colors.dart';

class CircleDecoration extends StatelessWidget {
  const CircleDecoration({super.key, required this.size});

  final double size;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: const BoxDecoration(
        shape: BoxShape.circle,
        color: AppColors.decorationCircle,
      ),
    );
  }
}
