import 'package:flutter/material.dart';
import '../../../core/constants/colors.dart';

class FilterChipWidget extends StatelessWidget {
  const FilterChipWidget({
    super.key,
    required this.label,
    required this.selected,
    required this.onTap,
    this.trailing,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: selected ? AppColors.primary : AppColors.surfaceChip,
          borderRadius: BorderRadius.circular(999),
          border: Border.all(
            color: selected ? AppColors.primary : AppColors.dividerSoft,
          ),
        ),
        child: Row(
          children: [
            Text(
              label,
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w800,
                color: selected ? Colors.white : Colors.grey.shade700,
              ),
            ),
            if (trailing != null) ...[
              const SizedBox(width: 2),
              IconTheme(
                data: IconThemeData(
                  color: selected ? Colors.white : Colors.grey.shade700,
                ),
                child: trailing!,
              ),
            ],
          ],
        ),
      ),
    );
  }
}
