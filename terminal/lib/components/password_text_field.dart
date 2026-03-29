import 'package:flutter/material.dart';

/// A custom password TextField with visibility toggle icon
class PasswordTextField extends StatefulWidget {
  final TextEditingController controller;
  final String label;
  final String? placeholder;
  final VoidCallback? onSubmitted;
  final bool autofocus;
  final bool readOnly;
  final InputDecoration? decoration;
  final TextInputAction? textInputAction;

  const PasswordTextField({
    super.key,
    required this.controller,
    required this.label,
    this.placeholder,
    this.onSubmitted,
    this.autofocus = false,
    this.readOnly = false,
    this.decoration,
    this.textInputAction,
  });

  @override
  State<PasswordTextField> createState() => _PasswordTextFieldState();
}

class _PasswordTextFieldState extends State<PasswordTextField> {
  bool _obscureText = true;

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: widget.controller,
      obscureText: _obscureText,
      autofocus: widget.autofocus,
      readOnly: widget.readOnly,
      textInputAction: widget.textInputAction,
      onSubmitted: (_) => widget.onSubmitted?.call(),
      decoration: (widget.decoration ?? const InputDecoration()).copyWith(
        labelText: widget.label,
        border: const OutlineInputBorder(),
        hintText: widget.placeholder,
        suffixIcon: Padding(
          padding: const EdgeInsets.only(right: 8),
          child: IconButton(
            icon: Icon(
              _obscureText ? Icons.visibility_off : Icons.visibility,
              color: Colors.grey[400],
            ),
            onPressed: () {
              setState(() {
                _obscureText = !_obscureText;
              });
            },
            tooltip: _obscureText ? 'Show password' : 'Hide password',
          ),
        ),
      ),
    );
  }
}
