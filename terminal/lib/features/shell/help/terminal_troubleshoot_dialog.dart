import 'package:flutter/material.dart';

class TerminalTroubleshootDialog extends StatelessWidget {
  const TerminalTroubleshootDialog({super.key});

  @override
  Widget build(BuildContext context) {
    return Material(
      color: const Color(0xFF08111F),
      child: SafeArea(
        child: Column(
          children: [
            // Top header
            Container(
              height: 64,
              padding: const EdgeInsets.symmetric(horizontal: 20),
              decoration: BoxDecoration(
                border: Border(
                  bottom: BorderSide(
                    color: Colors.white.withOpacity(0.06),
                  ),
                ),
              ),
              child: Row(
                children: [
                  const Text(
                    'Troubleshoot',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 28,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(width: 16),
                  TextButton(
                    onPressed: () {},
                    child: const Text('Give feedback'),
                  ),
                  const Spacer(),
                  IconButton(
                    onPressed: () => Navigator.of(context).pop(),
                    icon: const Icon(
                      Icons.close,
                      color: Color(0xFF4EA1FF),
                    ),
                  ),
                ],
              ),
            ),

            // Body
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(
                  horizontal: 32,
                  vertical: 28,
                ),
                child: Center(
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 760),
                    child: Column(
                      children: [
                        _TroubleshootRow(
                          title: 'Restart Virnyx Terminal',
                          subtitle:
                              'Restart the terminal UI without losing local data.',
                          buttonLabel: 'Restart',
                          onPressed: () {},
                        ),
                        _TroubleshootRow(
                          title: 'Support',
                          subtitle:
                              'Open support resources for help with Virnyx.',
                          buttonLabel: 'Get support',
                          onPressed: () {},
                        ),
                        _TroubleshootRow(
                          title: 'Retry Offline Sync',
                          subtitle:
                              'Retry syncing pending offline sales and queued actions.',
                          buttonLabel: 'Retry sync',
                          onPressed: () {},
                        ),
                        _TroubleshootRow(
                          title: 'Clean Temporary Cache',
                          subtitle:
                              'Remove non-critical local cache data.',
                          buttonLabel: 'Clean cache',
                          danger: true,
                          onPressed: () {},
                        ),
                        _TroubleshootRow(
                          title: 'Reset Local Terminal Data',
                          subtitle:
                              'Clear local session, cache, and unsynced working data.',
                          buttonLabel: 'Reset local data',
                          danger: true,
                          onPressed: () {},
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _TroubleshootRow extends StatelessWidget {
  final String title;
  final String subtitle;
  final String buttonLabel;
  final VoidCallback onPressed;
  final bool danger;

  const _TroubleshootRow({
    required this.title,
    required this.subtitle,
    required this.buttonLabel,
    required this.onPressed,
    this.danger = false,
  });

  @override
  Widget build(BuildContext context) {
    final buttonColor =
        danger ? const Color(0xFFEF4444) : const Color(0xFF2563EB);

    return Container(
      padding: const EdgeInsets.symmetric(vertical: 22),
      decoration: BoxDecoration(
        border: Border(
          bottom: BorderSide(
            color: Colors.white.withOpacity(0.06),
          ),
        ),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Expanded(
            child: Padding(
              padding: const EdgeInsets.only(right: 20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 22,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    subtitle,
                    style: TextStyle(
                      color: Colors.white.withOpacity(0.60),
                      fontSize: 14,
                      height: 1.45,
                    ),
                  ),
                ],
              ),
            ),
          ),
          SizedBox(
            width: 180,
            child: Align(
              alignment: Alignment.centerRight,
              child: OutlinedButton(
                onPressed: onPressed,
                style: OutlinedButton.styleFrom(
                  side: BorderSide(color: buttonColor.withOpacity(0.85)),
                  foregroundColor: buttonColor,
                  padding: const EdgeInsets.symmetric(
                    horizontal: 18,
                    vertical: 16,
                  ),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
                child: Text(buttonLabel),
              ),
            ),
          ),
        ],
      ),
    );
  }
}