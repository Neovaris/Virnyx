import 'package:flutter/material.dart';
import '../../../core/constants/colors.dart';

import '../models/shift_session.dart';
import '../services/shift_service.dart';

class ShiftCloseScreen extends StatefulWidget {
  const ShiftCloseScreen({super.key, required this.session});

  final ShiftSession session;

  @override
  State<ShiftCloseScreen> createState() => _ShiftCloseScreenState();
}

class _ShiftCloseScreenState extends State<ShiftCloseScreen> {
  final TextEditingController _closingAmountController =
      TextEditingController();

  ShiftSummary? _summary;
  bool _isLoadingSummary = true;
  bool _isClosing = false;

  @override
  void initState() {
    super.initState();
    _closingAmountController.text = widget.session.openingAmount
        .toStringAsFixed(2);
    _loadSummary();
  }

  @override
  void dispose() {
    _closingAmountController.dispose();
    super.dispose();
  }

  Future<void> _loadSummary() async {
    try {
      final ShiftSummary summary = await ShiftService.instance.getSummary(
        widget.session.id,
      );
      if (!mounted) {
        return;
      }
      setState(() {
        _summary = summary;
        _isLoadingSummary = false;
      });
    } catch (_) {
      if (!mounted) {
        return;
      }
      setState(() {
        _isLoadingSummary = false;
      });
    }
  }

  String _durationSinceOpen(DateTime openedAt) {
    final Duration d = DateTime.now().difference(openedAt);
    final int h = d.inHours;
    final int m = d.inMinutes % 60;
    return '${h}h ${m}m';
  }

  Future<void> _confirmAndClose() async {
    if (_isClosing) {
      return;
    }

    final double? closingCash = double.tryParse(
      _closingAmountController.text.trim(),
    );
    if (closingCash == null || closingCash < 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Enter a valid closing cash amount.')),
      );
      return;
    }

    final bool? confirmed = await showDialog<bool>(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          title: const Text('Close shift?'),
          content: const Text(
            'This will close the current shift and log you out.',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () => Navigator.pop(context, true),
              child: const Text('Close Shift'),
            ),
          ],
        );
      },
    );

    if (confirmed != true) {
      return;
    }

    setState(() {
      _isClosing = true;
    });

    try {
      final ShiftCloseResult result = await ShiftService.instance.closeShift(
        shiftId: widget.session.id,
        closingCash: closingCash,
      );

      if (!mounted) {
        return;
      }

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Shift closed. Difference: GHS ${result.difference.toStringAsFixed(2)}',
          ),
        ),
      );

      Navigator.pop(context, true);
    } catch (e) {
      if (!mounted) {
        return;
      }

      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(e.toString())));
      setState(() {
        _isClosing = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        backgroundColor: Theme.of(context).scaffoldBackgroundColor,
        elevation: 0,
        title: const Text(
          'Close Shift',
          style: TextStyle(fontWeight: FontWeight.w700),
        ),
      ),
      body: Padding(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 20),
        child: Column(
          children: [
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(18),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Shift Summary',
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
                  ),
                  const SizedBox(height: 12),
                  _summaryRow('Cashier', widget.session.cashierName),
                  _summaryRow(
                    'Shift duration',
                    _durationSinceOpen(widget.session.openedAt),
                  ),
                  _summaryRow(
                    'Opening amount',
                    'GHS ${widget.session.openingAmount.toStringAsFixed(2)}',
                  ),
                  if (_isLoadingSummary)
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: 8),
                      child: LinearProgressIndicator(),
                    ),
                  if (_summary != null) ...[
                    _summaryRow('Sales count', '${_summary!.salesCount}'),
                    _summaryRow(
                      'Sales total',
                      'GHS ${_summary!.salesTotal.toStringAsFixed(2)}',
                    ),
                    _summaryRow('Refunds', '${_summary!.refundsCount}'),
                    _summaryRow(
                      'Refund amount',
                      'GHS ${_summary!.refundsAmount.toStringAsFixed(2)}',
                    ),
                    _summaryRow(
                      'Expected cash',
                      'GHS ${_summary!.expectedCash.toStringAsFixed(2)}',
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 14),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: AppColors.cardBackground,
                borderRadius: BorderRadius.circular(16),
              ),
              child: const Text(
                'Once you close shift, cashier will be logged out.',
                style: TextStyle(
                  fontSize: 13,
                  color: AppColors.textSecondary,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
            const SizedBox(height: 14),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: AppColors.cardBackground,
                borderRadius: BorderRadius.circular(16),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Closing Cash',
                    style: TextStyle(fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 10),
                  TextField(
                    controller: _closingAmountController,
                    keyboardType: const TextInputType.numberWithOptions(
                      decimal: true,
                    ),
                    decoration: InputDecoration(
                      hintText: '0.00',
                      prefixText: 'GHS ',
                      filled: true,
                      fillColor: AppColors.disabledSurface,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(14),
                        borderSide: BorderSide.none,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const Spacer(),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _isClosing ? null : _confirmAndClose,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.textPrimary,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(999),
                  ),
                ),
                child: _isClosing
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : const Text(
                        'CLOSE SHIFT',
                        style: TextStyle(fontWeight: FontWeight.w800),
                      ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _summaryRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          Expanded(
            child: Text(
              label,
              style: const TextStyle(
                color: AppColors.textSecondary,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          Text(value, style: const TextStyle(fontWeight: FontWeight.w700)),
        ],
      ),
    );
  }
}
