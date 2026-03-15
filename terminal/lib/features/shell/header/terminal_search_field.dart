import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../sales/search/search_controller.dart';

class TerminalSearchField extends ConsumerStatefulWidget {
  const TerminalSearchField({super.key});

  @override
  ConsumerState<TerminalSearchField> createState() =>
      _TerminalSearchFieldState();
}

class _TerminalSearchFieldState extends ConsumerState<TerminalSearchField> {
  late final TextEditingController _controller;

  @override
  void initState() {
    super.initState();
    _controller = TextEditingController();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 46,
      padding: const EdgeInsets.symmetric(horizontal: 14),
      decoration: BoxDecoration(
        color: const Color(0xFF0B0E13),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(
          color: Colors.white.withOpacity(0.06),
        ),
      ),
      child: Row(
        children: [
          Icon(
            Icons.search,
            color: Colors.white54,
            size: 20,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: TextField(
              controller: _controller,
              onChanged: (value) {
                ref.read(salesSearchProvider.notifier).setQuery(value);
              },
              style: const TextStyle(
                color: Colors.white,
                fontSize: 14,
              ),
              decoration: const InputDecoration(
                hintText: "Search product or scan barcode...",
                hintStyle: TextStyle(
                  color: Colors.white38,
                ),
                border: InputBorder.none,
              ),
            ),
          ),
        ],
      ),
    );
  }
}