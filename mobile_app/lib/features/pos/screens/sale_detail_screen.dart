import 'dart:async';

import 'package:flutter/material.dart';
import '../../../core/constants/colors.dart';

import '../../../shared/services/api_client.dart';
import '../services/notification_service.dart';
import '../services/sales_history_service.dart';

class SaleDetailScreen extends StatefulWidget {
  const SaleDetailScreen({super.key, required this.saleId});

  final String saleId;

  @override
  State<SaleDetailScreen> createState() => _SaleDetailScreenState();
}

class _SaleDetailScreenState extends State<SaleDetailScreen> {
  bool _isLoading = true;
  bool _requestingRefund = false;
  String? _error;

  SaleDetail? _sale;
  List<RefundStatusItem> _refunds = <RefundStatusItem>[];
  final Map<String, String> _lastRefundStatuses = <String, String>{};

  Timer? _refundPolling;

  @override
  void initState() {
    super.initState();
    _loadData();
    _refundPolling = Timer.periodic(const Duration(seconds: 5), (_) {
      _refreshRefundsSilently();
    });
  }

  @override
  void dispose() {
    _refundPolling?.cancel();
    super.dispose();
  }

  Future<void> _loadData() async {
    if (!mounted) return;
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final SaleDetail sale = await SalesHistoryService.instance.getSaleDetail(
        widget.saleId,
      );
      final List<RefundStatusItem> refunds = await SalesHistoryService.instance
          .getSaleRefunds(widget.saleId);

      if (!mounted) return;
      setState(() {
        _sale = sale;
        _refunds = refunds;
        _isLoading = false;
      });
      for (final RefundStatusItem item in refunds) {
        final String status = item.approvalStatus.toUpperCase();
        _lastRefundStatuses[item.id] = status;
        if (status == 'PENDING_APPROVAL') {
          PosNotificationService.instance.watchRefundForApproval(
            refundId: item.id,
            saleId: widget.saleId,
          );
        }
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  Future<void> _refreshRefundsSilently() async {
    if (!mounted || _sale == null) return;
    try {
      final List<RefundStatusItem> refunds = await SalesHistoryService.instance
          .getSaleRefunds(widget.saleId);

      for (final RefundStatusItem refund in refunds) {
        final String current = refund.approvalStatus.toUpperCase();
        _lastRefundStatuses[refund.id] = current;
        if (current == 'PENDING_APPROVAL') {
          PosNotificationService.instance.watchRefundForApproval(
            refundId: refund.id,
            saleId: widget.saleId,
          );
        }
      }

      if (!mounted) return;
      setState(() {
        _refunds = refunds;
      });
    } catch (_) {
      // silent background poll failure
    }
  }

  String _formatDate(DateTime d) {
    final String hh = d.hour.toString().padLeft(2, '0');
    final String mm = d.minute.toString().padLeft(2, '0');
    return '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')} $hh:$mm';
  }

  Future<void> _requestRefund() async {
    final SaleDetail? sale = _sale;
    if (sale == null || _requestingRefund) return;

    final _RefundRequestInput? input = await showDialog<_RefundRequestInput>(
      context: context,
      builder: (BuildContext context) {
        return _RefundRequestDialog(total: sale.total);
      },
    );

    if (input == null) return;

    setState(() => _requestingRefund = true);

    try {
      final RefundStatusItem refund = await SalesHistoryService.instance
          .requestRefund(
            saleId: widget.saleId,
            amount: input.amount,
            reason: input.reason,
          );

      if (!mounted) return;
      setState(() {
        _requestingRefund = false;
        _refunds = <RefundStatusItem>[refund, ..._refunds];
      });

      _lastRefundStatuses[refund.id] = refund.approvalStatus.toUpperCase();

      PosNotificationService.instance.add(
        PosNotificationItem(
          id: 'refund-requested-${refund.id}-${DateTime.now().millisecondsSinceEpoch}',
          title: refund.approvalStatus == 'PENDING_APPROVAL'
              ? 'Refund requested: waiting for admin approval'
              : 'Refund processed successfully',
          type: refund.approvalStatus == 'PENDING_APPROVAL'
              ? PosNotificationType.info
              : PosNotificationType.success,
          createdAt: DateTime.now(),
          actionLabel: 'View Details',
          saleId: widget.saleId,
          refundId: refund.id,
        ),
      );

      if (refund.approvalStatus.toUpperCase() == 'PENDING_APPROVAL') {
        PosNotificationService.instance.watchRefundForApproval(
          refundId: refund.id,
          saleId: widget.saleId,
        );
      }

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            refund.approvalStatus == 'PENDING_APPROVAL'
                ? 'Refund requested. Waiting for admin approval.'
                : 'Refund processed successfully.',
          ),
        ),
      );
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() => _requestingRefund = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            e.message.isEmpty ? 'Refund request failed.' : e.message,
          ),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      setState(() => _requestingRefund = false);
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Refund request failed: $e')));
    }
  }

  Color _statusColor(String status) {
    switch (status) {
      case 'APPROVED':
        return AppColors.successGreen;
      case 'REJECTED':
        return AppColors.dangerRed;
      case 'PENDING_APPROVAL':
      default:
        return AppColors.warningAmberDark;
    }
  }

  String _statusLabel(String status) {
    switch (status) {
      case 'APPROVED':
        return 'Approved';
      case 'REJECTED':
        return 'Rejected';
      case 'PENDING_APPROVAL':
      default:
        return 'Pending Approval';
    }
  }

  @override
  Widget build(BuildContext context) {
    final SaleDetail? sale = _sale;

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        backgroundColor: Theme.of(context).scaffoldBackgroundColor,
        elevation: 0,
        title: const Text(
          'Sale Details',
          style: TextStyle(color: Colors.black, fontWeight: FontWeight.w700),
        ),
        iconTheme: const IconThemeData(color: Colors.black),
        actions: [
          IconButton(
            onPressed: _loadData,
            icon: const Icon(Icons.refresh),
            tooltip: 'Refresh',
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
          ? Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(
                      Icons.error_outline,
                      color: Colors.redAccent,
                      size: 38,
                    ),
                    const SizedBox(height: 10),
                    Text(_error!, textAlign: TextAlign.center),
                    const SizedBox(height: 12),
                    ElevatedButton(
                      onPressed: _loadData,
                      child: const Text('Retry'),
                    ),
                  ],
                ),
              ),
            )
          : sale == null
          ? const Center(child: Text('Sale not found'))
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        sale.receiptNo?.isNotEmpty == true
                            ? sale.receiptNo!
                            : sale.id,
                        style: const TextStyle(
                          fontWeight: FontWeight.w800,
                          fontSize: 16,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        _formatDate(sale.createdAt),
                        style: const TextStyle(
                          color: AppColors.textSecondary,
                          fontSize: 12,
                        ),
                      ),
                      const SizedBox(height: 10),
                      if (sale.payments.isNotEmpty)
                        Text(
                          'Payment: ${sale.payments.first.method}',
                          style: const TextStyle(fontWeight: FontWeight.w600),
                        ),
                      const SizedBox(height: 8),
                      _moneyRow('Subtotal', sale.subtotal),
                      _moneyRow('Discount', sale.discount),
                      _moneyRow('Tax', sale.tax),
                      const Divider(height: 20),
                      _moneyRow('Total', sale.total, bold: true),
                    ],
                  ),
                ),
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Items',
                        style: TextStyle(
                          fontWeight: FontWeight.w800,
                          fontSize: 16,
                        ),
                      ),
                      const SizedBox(height: 10),
                      if (sale.items.isEmpty)
                        const Text('No items found')
                      else
                        ...sale.items.map((SaleDetailItem item) {
                          return Padding(
                            padding: const EdgeInsets.only(bottom: 8),
                            child: Row(
                              children: [
                                Expanded(
                                  child: Text(
                                    '${item.name} x${item.qty}',
                                    style: const TextStyle(
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ),
                                Text(
                                  'GHS ${item.lineTotal.toStringAsFixed(2)}',
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                              ],
                            ),
                          );
                        }),
                    ],
                  ),
                ),
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: _requestingRefund ? null : _requestRefund,
                    icon: const Icon(Icons.reply_all),
                    label: Text(
                      _requestingRefund ? 'Requesting...' : 'Request Refund',
                    ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.warningAmber,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Refund Requests',
                        style: TextStyle(
                          fontWeight: FontWeight.w800,
                          fontSize: 16,
                        ),
                      ),
                      const SizedBox(height: 10),
                      if (_refunds.isEmpty)
                        const Text(
                          'No refund requests for this sale.',
                          style: TextStyle(color: AppColors.textSecondary),
                        )
                      else
                        ..._refunds.map((RefundStatusItem refund) {
                          final Color color = _statusColor(
                            refund.approvalStatus,
                          );
                          return Container(
                            margin: const EdgeInsets.only(bottom: 10),
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: AppColors.disabledSurface,
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.symmetric(
                                        horizontal: 8,
                                        vertical: 4,
                                      ),
                                      decoration: BoxDecoration(
                                        color: color.withValues(alpha: 0.12),
                                        borderRadius: BorderRadius.circular(
                                          999,
                                        ),
                                      ),
                                      child: Text(
                                        _statusLabel(refund.approvalStatus),
                                        style: TextStyle(
                                          color: color,
                                          fontSize: 12,
                                          fontWeight: FontWeight.w700,
                                        ),
                                      ),
                                    ),
                                    const Spacer(),
                                    Text(
                                      'GHS ${refund.amount.toStringAsFixed(2)}',
                                      style: const TextStyle(
                                        fontWeight: FontWeight.w800,
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 6),
                                Text(
                                  _formatDate(refund.createdAt),
                                  style: const TextStyle(
                                    fontSize: 12,
                                    color: AppColors.textSecondary,
                                  ),
                                ),
                                if ((refund.reason ?? '').trim().isNotEmpty)
                                  Padding(
                                    padding: const EdgeInsets.only(top: 6),
                                    child: Text('Reason: ${refund.reason}'),
                                  ),
                                if (refund.approvalStatus == 'PENDING_APPROVAL')
                                  const Padding(
                                    padding: EdgeInsets.only(top: 6),
                                    child: Text(
                                      'Waiting for admin approval...',
                                      style: TextStyle(
                                        color: AppColors.warningAmberDark,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                  ),
                                if (refund.approvalStatus == 'REJECTED' &&
                                    (refund.rejectionReason ?? '')
                                        .trim()
                                        .isNotEmpty)
                                  Padding(
                                    padding: const EdgeInsets.only(top: 6),
                                    child: Text(
                                      'Rejection: ${refund.rejectionReason}',
                                      style: const TextStyle(
                                        color: AppColors.dangerRed,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                  ),
                              ],
                            ),
                          );
                        }),
                    ],
                  ),
                ),
              ],
            ),
    );
  }

  Widget _moneyRow(String label, double amount, {bool bold = false}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        children: [
          Expanded(
            child: Text(
              label,
              style: TextStyle(
                fontWeight: bold ? FontWeight.w800 : FontWeight.w600,
              ),
            ),
          ),
          Text(
            'GHS ${amount.toStringAsFixed(2)}',
            style: TextStyle(
              fontWeight: bold ? FontWeight.w800 : FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}

class _RefundRequestInput {
  const _RefundRequestInput({required this.amount, required this.reason});

  final double amount;
  final String reason;
}

class _RefundRequestDialog extends StatefulWidget {
  const _RefundRequestDialog({required this.total});

  final double total;

  @override
  State<_RefundRequestDialog> createState() => _RefundRequestDialogState();
}

class _RefundRequestDialogState extends State<_RefundRequestDialog> {
  late final TextEditingController _amountCtrl;
  final TextEditingController _reasonCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    _amountCtrl = TextEditingController(text: widget.total.toStringAsFixed(2));
  }

  @override
  void dispose() {
    _amountCtrl.dispose();
    _reasonCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Request Refund'),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          TextField(
            controller: _amountCtrl,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            decoration: const InputDecoration(labelText: 'Amount (GHS)'),
          ),
          const SizedBox(height: 10),
          TextField(
            controller: _reasonCtrl,
            maxLines: 3,
            decoration: const InputDecoration(
              labelText: 'Reason',
              hintText: 'Explain why refund is requested',
            ),
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Cancel'),
        ),
        FilledButton(
          onPressed: () {
            final double amount = double.tryParse(_amountCtrl.text.trim()) ?? 0;
            final String reason = _reasonCtrl.text.trim();

            if (amount <= 0) {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Enter a valid amount greater than 0.'),
                ),
              );
              return;
            }
            if (amount > widget.total) {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Refund amount cannot exceed sale total.'),
                ),
              );
              return;
            }
            if (reason.isEmpty) {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Reason is required.')),
              );
              return;
            }

            Navigator.pop(
              context,
              _RefundRequestInput(amount: amount, reason: reason),
            );
          },
          child: const Text('Submit Request'),
        ),
      ],
    );
  }
}
