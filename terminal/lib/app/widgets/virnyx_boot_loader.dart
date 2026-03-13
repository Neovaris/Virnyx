import 'dart:math' as math;
import 'dart:ui';
import 'package:flutter/material.dart';

class VirnyxBootLoader extends StatefulWidget {
  final Duration duration;
  final VoidCallback? onComplete;

  const VirnyxBootLoader({
    super.key,
    this.duration = const Duration(milliseconds: 3800),
    this.onComplete,
  });

  @override
  State<VirnyxBootLoader> createState() => _VirnyxBootLoaderState();
}

class _VirnyxBootLoaderState extends State<VirnyxBootLoader>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  late final Animation<double> travel;
  late final Animation<double> morph;
  late final Animation<double> scale;
  late final Animation<double> expand;
  late final Animation<double> textSlide;
  late final Animation<double> textOpacity;

  @override
  void initState() {
    super.initState();

    _controller = AnimationController(
      vsync: this,
      duration: widget.duration,
    );

    // 1) Incoming horizontal travel
    travel = CurvedAnimation(
      parent: _controller,
      curve: const Interval(0.00, 0.45, curve: Curves.easeInOutCubic),
    );

    // 2) Morph into V
    morph = CurvedAnimation(
      parent: _controller,
      curve: const Interval(0.42, 0.70, curve: Curves.easeInOutCubic),
    );

    // 3) Small scale-up after V forms
    scale = Tween<double>(begin: 1.0, end: 1.05).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(0.70, 0.80, curve: Curves.easeOutCubic),
      ),
    );

    // 4) Slight expansion to give the V a thicker logo feel
    expand = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(0.72, 0.86, curve: Curves.easeOutCubic),
      ),
    );

    // 5) Text reveal
    textSlide = Tween<double>(begin: 32.0, end: 0.0).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(0.78, 0.94, curve: Curves.easeOutCubic),
      ),
    );

    textOpacity = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(0.80, 0.94, curve: Curves.easeOut),
      ),
    );

    _controller.forward().then((_) {
      widget.onComplete?.call();
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.of(context).size;

    return AnimatedBuilder(
      animation: _controller,
      builder: (context, _) {
        return Container(
          color: Colors.black,
          child: CustomPaint(
            painter: _VirnyxPainter(
              travelT: travel.value,
              morphT: morph.value,
              scale: scale.value,
              expand: expand.value,
              textSlide: textSlide.value,
              textOpacity: textOpacity.value,
              screenSize: size,
            ),
            child: const SizedBox.expand(),
          ),
        );
      },
    );
  }
}

class _VirnyxPainter extends CustomPainter {
  final double travelT;
  final double morphT;
  final double scale;
  final double expand;
  final double textSlide;
  final double textOpacity;
  final Size screenSize;

  _VirnyxPainter({
    required this.travelT,
    required this.morphT,
    required this.scale,
    required this.expand,
    required this.textSlide,
    required this.textOpacity,
    required this.screenSize,
  });

  Offset lerpOffset(Offset a, Offset b, double t) {
    return Offset(
      lerpDouble(a.dx, b.dx, t)!,
      lerpDouble(a.dy, b.dy, t)!,
    );
  }

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);

    final stroke = Paint()
      ..color = Colors.white
      ..strokeWidth = 2.2
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round
      ..style = PaintingStyle.stroke;

    final glow = Paint()
      ..color = Colors.white.withOpacity(0.16)
      ..strokeWidth = 8
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 8)
      ..style = PaintingStyle.stroke;

    // Final V proportions
    final vHeight = size.height * 0.17;
    final armLength = size.width * 0.058;

    // Slightly left-shifted join so full wordmark balances visually
    final join = center.translate(-22, 16);

    final leftOuter = Offset(join.dx - armLength, join.dy - vHeight);
    final rightOuter = Offset(join.dx + armLength, join.dy - vHeight);

    // Keep the travelling lines behavior intact
    final leftTravelStart = Offset(-armLength, join.dy - vHeight);
    final leftTravelEnd = Offset(join.dx, join.dy - vHeight);

    final rightTravelStart = Offset(size.width + armLength, join.dy - vHeight);
    final rightTravelEnd = Offset(join.dx, join.dy - vHeight);

    final leftStartTravel = lerpOffset(leftTravelStart, leftOuter, travelT);
    final leftEndTravel = lerpOffset(
      leftTravelStart.translate(armLength, 0),
      leftTravelEnd,
      travelT,
    );

    final rightStartTravel = lerpOffset(rightTravelStart, rightOuter, travelT);
    final rightEndTravel = lerpOffset(
      rightTravelStart.translate(-armLength, 0),
      rightTravelEnd,
      travelT,
    );

    // Morph into V
    final leftStart = lerpOffset(leftStartTravel, leftOuter, morphT);
    final leftEnd = lerpOffset(leftEndTravel, join, morphT);

    final rightStart = lerpOffset(rightStartTravel, rightOuter, morphT);
    final rightEnd = lerpOffset(rightEndTravel, join, morphT);

    // Small scale pop from the join
    Offset scaleFromJoin(Offset p) {
      final dx = p.dx - join.dx;
      final dy = p.dy - join.dy;
      return Offset(join.dx + dx * scale, join.dy + dy * scale);
    }

    final ls = scaleFromJoin(leftStart);
    final le = scaleFromJoin(leftEnd);
    final rs = scaleFromJoin(rightStart);
    final re = scaleFromJoin(rightEnd);

    // Expand the V slightly after it forms to make it feel less thin
    final expandOffset = 2.6 * expand;

    Offset perpendicularOffset(Offset a, Offset b) {
      final dx = b.dx - a.dx;
      final dy = b.dy - a.dy;
      final length = math.sqrt(dx * dx + dy * dy);
      if (length == 0) return Offset.zero;

      final nx = -dy / length;
      final ny = dx / length;
      return Offset(nx * expandOffset, ny * expandOffset);
    }

    final leftNormal = perpendicularOffset(ls, le);
    final rightNormal = perpendicularOffset(rs, re);

    // Draw expanded double-stroke V
    canvas.drawLine(ls + leftNormal, le + leftNormal, glow);
    canvas.drawLine(ls - leftNormal, le - leftNormal, glow);
    canvas.drawLine(rs + rightNormal, re + rightNormal, glow);
    canvas.drawLine(rs - rightNormal, re - rightNormal, glow);

    canvas.drawLine(ls + leftNormal, le + leftNormal, stroke);
    canvas.drawLine(ls - leftNormal, le - leftNormal, stroke);
    canvas.drawLine(rs + rightNormal, re + rightNormal, stroke);
    canvas.drawLine(rs - rightNormal, re - rightNormal, stroke);

    // Text reveal
    if (textOpacity > 0) {
      final fontSize = size.width < 500 ? 36.0 : 50.0;

      final textPainter = TextPainter(
        text: TextSpan(
          text: 'irnyx',
          style: TextStyle(
            color: Colors.white.withOpacity(textOpacity),
            fontSize: fontSize,
            fontWeight: FontWeight.w700,
            letterSpacing: 1.0,
          ),
        ),
        textDirection: TextDirection.ltr,
      )..layout();

      final offset = Offset(
        join.dx + armLength * 0.95 + 16 + textSlide,
        join.dy - textPainter.height * 0.72,
      );

      textPainter.paint(canvas, offset);
    }
  }

  @override
  bool shouldRepaint(covariant _VirnyxPainter oldDelegate) {
    return oldDelegate.travelT != travelT ||
        oldDelegate.morphT != morphT ||
        oldDelegate.scale != scale ||
        oldDelegate.expand != expand ||
        oldDelegate.textSlide != textSlide ||
        oldDelegate.textOpacity != textOpacity;
  }
}

/// Example splash screen usage
class VirnyxBootScreen extends StatefulWidget {
  const VirnyxBootScreen({super.key});

  @override
  State<VirnyxBootScreen> createState() => _VirnyxBootScreenState();
}

class _VirnyxBootScreenState extends State<VirnyxBootScreen> {
  bool _done = false;

  Future<void> _handleComplete() async {
    await Future.delayed(const Duration(milliseconds: 700));
    if (!mounted) return;

    setState(() {
      _done = true;
    });

    // Example navigation:
    // Navigator.of(context).pushReplacementNamed('/home');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: AnimatedOpacity(
        opacity: _done ? 0.0 : 1.0,
        duration: const Duration(milliseconds: 450),
        child: VirnyxBootLoader(
          onComplete: _handleComplete,
        ),
      ),
    );
  }
}