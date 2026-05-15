import 'package:flutter/material.dart';
import '../../../core/constants/colors.dart';

class TopBar extends StatelessWidget {
  const TopBar({
    super.key,
    required this.onMenuTap,
    required this.onNotificationsTap,
    this.unreadCount = 0,
  });

  final VoidCallback onMenuTap;
  final VoidCallback onNotificationsTap;
  final int unreadCount;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 10, 16, 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          _TopIconButton(onTap: onMenuTap, child: const _MenuGlyph()),
          Stack(
            clipBehavior: Clip.none,
            children: [
              _TopIconButton(
                onTap: onNotificationsTap,
                icon: Icon(
                  Icons.notifications_none_rounded,
                  color: Colors.grey.shade700,
                  size: 22,
                ),
              ),
              if (unreadCount > 0)
                Positioned(
                  right: 6,
                  top: 6,
                  child: Container(
                    constraints: const BoxConstraints(
                      minWidth: 16,
                      minHeight: 16,
                    ),
                    padding: const EdgeInsets.symmetric(horizontal: 4),
                    decoration: const BoxDecoration(
                      color: AppColors.badgeRed,
                      shape: BoxShape.circle,
                    ),
                    alignment: Alignment.center,
                    child: Text(
                      unreadCount > 9 ? '9+' : '$unreadCount',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 9,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }
}

class _TopIconButton extends StatelessWidget {
  const _TopIconButton({this.child, this.icon, required this.onTap})
    : assert(child != null || icon != null);

  final Widget? child;
  final Widget? icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 46,
      height: 46,
      child: IconButton(
        onPressed: onTap,
        padding: EdgeInsets.zero,
        splashRadius: 20,
        icon: child ?? icon!,
      ),
    );
  }
}

class _MenuGlyph extends StatelessWidget {
  const _MenuGlyph();

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 22,
      height: 16,
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: const [
          _GlyphBar(width: 18, color: AppColors.menuGlyph),
          SizedBox(height: 3),
          _GlyphBar(width: 10, color: AppColors.menuGlyphAccent),
          SizedBox(height: 3),
          _GlyphBar(width: 18, color: AppColors.menuGlyph),
        ],
      ),
    );
  }
}

class _GlyphBar extends StatelessWidget {
  const _GlyphBar({required this.width, required this.color});

  final double width;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: width,
      height: 3,
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(99),
      ),
    );
  }
}
