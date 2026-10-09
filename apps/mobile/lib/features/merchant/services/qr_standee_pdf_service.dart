import 'dart:typed_data';
import 'package:flutter/material.dart' as material;
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';

/// QrStandeePdfService
/// Generates A4 Printable QR Standee posters for merchant counter desks & entry gates.
/// Includes:
/// - Brand Header with Electric Orange highlight
/// - High-contrast vector QR code pointing to branch join URL
/// - Tagline: "Line mein nahi, time par" (लाइन में नहीं, टाइम पर)
/// - 3-step customer onboarding guide
class QrStandeePdfService {
  static Future<Uint8List> generateStandeePdf({
    required String branchId,
    required String branchName,
    String? city,
    String? address,
  }) async {
    final pdf = pw.Document();

    final joinUrl = 'https://queueless.in/b/$branchId';

    // Fetch Google Fonts for PDF rendering
    final fontHeading = await PdfGoogleFonts.bricolageGrotesqueBold();
    final fontBody = await PdfGoogleFonts.manropeRegular();
    final fontBodyBold = await PdfGoogleFonts.manropeBold();

    pdf.addPage(
      pw.Page(
        pageFormat: PdfPageFormat.a4,
        margin: const pw.EdgeInsets.all(32),
        build: (pw.Context context) {
          return pw.Container(
            decoration: pw.BoxDecoration(
              border: pw.Border.all(color: PdfColor.fromHex('#F97316'), width: 4),
              borderRadius: const pw.BorderRadius.all(pw.Radius.circular(16)),
              color: PdfColor.fromHex('#0B0F19'),
            ),
            padding: const pw.EdgeInsets.symmetric(horizontal: 32, vertical: 28),
            child: pw.Column(
              crossAxisAlignment: pw.CrossAxisAlignment.center,
              mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
              children: [
                // Header section
                pw.Column(
                  children: [
                    pw.Container(
                      padding: const pw.EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      decoration: pw.BoxDecoration(
                        color: PdfColor.fromHex('#F97316'),
                        borderRadius: const pw.BorderRadius.all(pw.Radius.circular(8)),
                      ),
                      child: pw.Text(
                        'QueueLess India',
                        style: pw.TextStyle(
                          font: fontHeading,
                          fontSize: 26,
                          color: PdfColors.white,
                        ),
                      ),
                    ),
                    pw.SizedBox(height: 12),
                    pw.Text(
                      '\"Line mein nahi, time par\"',
                      style: pw.TextStyle(
                        font: fontBodyBold,
                        fontSize: 18,
                        color: PdfColor.fromHex('#F97316'),
                      ),
                    ),
                    pw.SizedBox(height: 8),
                    pw.Text(
                      branchName,
                      style: pw.TextStyle(
                        font: fontHeading,
                        fontSize: 22,
                        color: PdfColors.white,
                      ),
                      textAlign: pw.TextAlign.center,
                    ),
                    if (city != null || address != null) ...[
                      pw.SizedBox(height: 4),
                      pw.Text(
                        '${address ?? ''}${city != null ? ', $city' : ''}',
                        style: pw.TextStyle(
                          font: fontBody,
                          fontSize: 11,
                          color: PdfColor.fromHex('#94A3B8'),
                        ),
                      ),
                    ],
                  ],
                ),

                // Center QR Code Card
                pw.Container(
                  padding: const pw.EdgeInsets.all(20),
                  decoration: pw.BoxDecoration(
                    color: PdfColors.white,
                    borderRadius: const pw.BorderRadius.all(pw.Radius.circular(20)),
                    boxShadow: const [
                      pw.BoxShadow(
                        color: PdfColors.black,
                        blurRadius: 10,
                        spreadRadius: 2,
                      )
                    ],
                  ),
                  child: pw.Column(
                    children: [
                      pw.BarcodeWidget(
                        barcode: pw.Barcode.qrCode(
                          errorCorrectLevel: pw.BarcodeQRCorrectionLevel.high,
                        ),
                        data: joinUrl,
                        width: 210,
                        height: 210,
                        color: PdfColor.fromHex('#0B0F19'),
                      ),
                      pw.SizedBox(height: 12),
                      pw.Text(
                        'SCAN WITH ANY PHONE OR UPI APP',
                        style: pw.TextStyle(
                          font: fontBodyBold,
                          fontSize: 11,
                          color: PdfColor.fromHex('#0B0F19'),
                        ),
                      ),
                    ],
                  ),
                ),

                // 3-Step Instruction Guide
                pw.Container(
                  padding: const pw.EdgeInsets.all(16),
                  decoration: pw.BoxDecoration(
                    color: PdfColor.fromHex('#121A2B'),
                    borderRadius: const pw.BorderRadius.all(pw.Radius.circular(12)),
                    border: pw.Border.all(color: PdfColor.fromHex('#1E293B')),
                  ),
                  child: pw.Row(
                    mainAxisAlignment: pw.MainAxisAlignment.spaceAround,
                    children: [
                      _buildStep(
                        step: '1',
                        title: 'Scan QR Code',
                        desc: 'Open camera or scanner. No app download needed.',
                        fontHeading: fontBodyBold,
                        fontBody: fontBody,
                      ),
                      _buildStep(
                        step: '2',
                        title: 'Get Live Token',
                        desc: 'Receive live queue updates and relax anywhere.',
                        fontHeading: fontBodyBold,
                        fontBody: fontBody,
                      ),
                      _buildStep(
                        step: '3',
                        title: 'Walk in on Ring',
                        desc: 'Phone rings loud when your counter is ready.',
                        fontHeading: fontBodyBold,
                        fontBody: fontBody,
                      ),
                    ],
                  ),
                ),

                // Footer
                pw.Row(
                  mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                  children: [
                    pw.Text(
                      'Zero-hardware Queue Management | DPDP Act 2023 Compliant',
                      style: pw.TextStyle(
                        font: fontBody,
                        fontSize: 9,
                        color: PdfColor.fromHex('#64748B'),
                      ),
                    ),
                    pw.Text(
                      joinUrl,
                      style: pw.TextStyle(
                        font: fontBodyBold,
                        fontSize: 9,
                        color: PdfColor.fromHex('#F97316'),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          );
        },
      ),
    );

    return pdf.save();
  }

  static pw.Widget _buildStep({
    required String step,
    required String title,
    required String desc,
    required pw.Font fontHeading,
    required pw.Font fontBody,
  }) {
    return pw.Container(
      width: 130,
      child: pw.Column(
        children: [
          pw.Container(
            width: 24,
            height: 24,
            decoration: pw.BoxDecoration(
              color: PdfColor.fromHex('#F97316'),
              shape: pw.BoxShape.circle,
            ),
            child: pw.Center(
              child: pw.Text(
                step,
                style: pw.TextStyle(
                  font: fontHeading,
                  fontSize: 12,
                  color: PdfColors.white,
                ),
              ),
            ),
          ),
          pw.SizedBox(height: 6),
          pw.Text(
            title,
            style: pw.TextStyle(
              font: fontHeading,
              fontSize: 11,
              color: PdfColors.white,
            ),
            textAlign: pw.TextAlign.center,
          ),
          pw.SizedBox(height: 4),
          pw.Text(
            desc,
            style: pw.TextStyle(
              font: fontBody,
              fontSize: 8.5,
              color: PdfColor.fromHex('#94A3B8'),
            ),
            textAlign: pw.TextAlign.center,
          ),
        ],
      ),
    );
  }

  /// Direct print or PDF export preview
  static Future<void> printStandee(material.BuildContext context, {
    required String branchId,
    required String branchName,
    String? city,
  }) async {
    await Printing.layoutPdf(
      onLayout: (PdfPageFormat format) async => await generateStandeePdf(
        branchId: branchId,
        branchName: branchName,
        city: city,
      ),
      name: 'QueueLess_Standee_$branchName.pdf',
    );
  }
}
