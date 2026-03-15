import 'package:flutter/material.dart';

class TerminalTopStrip extends StatelessWidget {
  const TerminalTopStrip({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 32,
      padding: const EdgeInsets.symmetric(horizontal: 14),
      decoration: BoxDecoration(
        color: const Color(0xFF0F1117),
        border: Border(
          bottom: BorderSide(
            color: Colors.white.withOpacity(0.05),
          ),
        ),
      ),
      child: Row(
        children: [
          const Icon(
            Icons.point_of_sale,
            size: 16,
            color: Colors.white70,
          ),

          const SizedBox(width: 8),

          const Text(
            "Virnyx",
            style: TextStyle(
              fontWeight: FontWeight.w600,
              fontSize: 13,
              color: Colors.white,
            ),
          ),

          const SizedBox(width: 6),

          Container(
            padding: const EdgeInsets.symmetric(
              horizontal: 6,
              vertical: 2,
            ),
            decoration: BoxDecoration(
              color: const Color(0xFF1F2937),
              borderRadius: BorderRadius.circular(6),
            ),
            child: const Text(
              "terminal",
              style: TextStyle(
                fontSize: 10,
                color: Colors.white70,
              ),
            ),
          ),

          const Spacer(),

          const Text(
            "Main Store",
            style: TextStyle(
              fontSize: 11,
              color: Colors.white54,
            ),
          ),
        ],
      ),
    );
  }
}