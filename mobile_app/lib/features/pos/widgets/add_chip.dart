import 'package:flutter/material.dart';
import '../../../core/constants/colors.dart';

class AddChip extends StatelessWidget {
  const AddChip({super.key, required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: AppColors.surfaceChip,
          borderRadius: BorderRadius.circular(999),
          border: Border.all(color: AppColors.dividerSoft),
        ),
        child: Row(
          children: [
            Icon(
              Icons.add_circle_outline_rounded,
              size: 15,
              color: Colors.grey.shade700,
            ),
            const SizedBox(width: 5),
            Text(
              'ADD',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w800,
                color: Colors.grey.shade700,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
