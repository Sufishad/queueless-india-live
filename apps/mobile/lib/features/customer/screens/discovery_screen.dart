import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_typography.dart';
import '../../../core/services/autostart_guidance_dialog.dart';
import '../../merchant/screens/merchant_console_screen.dart';
import '../models/branch_model.dart';
import '../models/queue_token_model.dart';
import '../providers/customer_queue_notifier.dart';
import '../widgets/branch_card.dart';
import '../widgets/join_queue_sheet.dart';
import '../widgets/token_ticket_widget.dart';

class DiscoveryScreen extends ConsumerStatefulWidget {
  const DiscoveryScreen({super.key});

  @override
  ConsumerState<DiscoveryScreen> createState() => _DiscoveryScreenState();
}

class _DiscoveryScreenState extends ConsumerState<DiscoveryScreen> {
  String _selectedCity = 'All';
  String _selectedCategory = 'All';
  String _searchQuery = '';
  final _searchController = TextEditingController();

  final List<String> _cities = ['All', 'Bengaluru', 'Mumbai', 'Delhi', 'Pune'];
  final List<String> _categories = ['All', 'CLINIC', 'SALON', 'BANK', 'GOVT/RTO'];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      AutostartGuidanceDialog.showIfRequired(context);
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _openJoinQueueSheet(BranchModel branch) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => JoinQueueSheet(
        branch: branch,
        onTokenIssued: (token) {
          _showTicketDialog(token);
        },
      ),
    );
  }

  void _showTicketDialog(QueueTokenModel token) {
    showDialog(
      context: context,
      builder: (ctx) => Dialog(
        backgroundColor: Colors.transparent,
        insetPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 24),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TokenTicketWidget(
                token: token,
                onLeaveQueue: () {
                  ref.read(customerQueueNotifierProvider.notifier).leaveQueue();
                  Navigator.pop(ctx);
                },
              ),
              const SizedBox(height: 12),
              ElevatedButton(
                onPressed: () => Navigator.pop(ctx),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.panel,
                  side: const BorderSide(color: AppColors.cardBorder),
                ),
                child: const Text('Close (बंद करें)'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final queueState = ref.watch(customerQueueNotifierProvider);
    final activeToken = queueState.activeToken;

    // Filter branches based on search, city, and category
    final filteredBranches = queueState.branches.where((b) {
      final matchesSearch = _searchQuery.isEmpty ||
          b.name.toLowerCase().contains(_searchQuery.toLowerCase()) ||
          b.area.toLowerCase().contains(_searchQuery.toLowerCase()) ||
          b.category.toLowerCase().contains(_searchQuery.toLowerCase());

      final matchesCity = _selectedCity == 'All' || b.city == _selectedCity;
      final matchesCategory =
          _selectedCategory == 'All' || b.category.toUpperCase() == _selectedCategory;

      return matchesSearch && matchesCity && matchesCategory;
    }).toList();

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Row(
          children: [
            Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                color: AppColors.primaryGlow,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: AppColors.primary),
              ),
              child: const Icon(
                Icons.confirmation_number_outlined,
                color: AppColors.primary,
                size: 18,
              ),
            ),
            const SizedBox(width: 10),
            Text('QueueLess India', style: AppTypography.headingLarge),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.storefront_rounded, color: AppColors.primary),
            tooltip: 'Merchant Console',
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (_) => const MerchantConsoleScreen(
                    branchId: 'b-blr-01',
                    branchName: 'Koramangala Express Branch',
                  ),
                ),
              );
            },
          ),
          IconButton(
            icon: const Icon(Icons.notifications_none, color: AppColors.textPrimary),
            onPressed: () {},
          ),
        ],
      ),
      body: CustomScrollView(
        slivers: [
          // Active Token Banner (if customer has an active ticket)
          if (activeToken != null)
            SliverToBoxAdapter(
              child: Container(
                margin: const EdgeInsets.fromLTRB(16, 8, 16, 12),
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: AppColors.panel,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: AppColors.primary),
                ),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      decoration: BoxDecoration(
                        color: AppColors.primaryGlow,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        '#${activeToken.number}',
                        style: AppTypography.telemetryValue.copyWith(
                          color: AppColors.primary,
                          fontSize: 20,
                        ),
                      ),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            activeToken.branchName,
                            style: AppTypography.labelBold,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          const SizedBox(height: 2),
                          Text(
                            activeToken.status == CustomerTokenStatus.called
                                ? 'CALLED! Proceed to counter'
                                : 'Position ${activeToken.positionInQueue} · ~${activeToken.estWaitMin}m wait',
                            style: AppTypography.bodySmall.copyWith(
                              color: activeToken.status == CustomerTokenStatus.called
                                  ? AppColors.success
                                  : AppColors.textSecondary,
                            ),
                          ),
                        ],
                      ),
                    ),
                    OutlinedButton(
                      onPressed: () => _showTicketDialog(activeToken),
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                        side: const BorderSide(color: AppColors.primary),
                      ),
                      child: Text(
                        'View Ticket',
                        style: AppTypography.bodySmall.copyWith(
                          color: AppColors.primary,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),

          // Search Input Bar
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
              child: TextField(
                controller: _searchController,
                onChanged: (val) => setState(() => _searchQuery = val),
                style: AppTypography.bodyMedium,
                decoration: InputDecoration(
                  hintText: 'Search clinic, salon, bank, RTO...',
                  prefixIcon: const Icon(Icons.search, color: AppColors.textSecondary),
                  suffixIcon: _searchQuery.isNotEmpty
                      ? IconButton(
                          icon: const Icon(Icons.clear, color: AppColors.textMuted),
                          onPressed: () {
                            _searchController.clear();
                            setState(() => _searchQuery = '');
                          },
                        )
                      : null,
                ),
              ),
            ),
          ),

          // City Chips Filter
          SliverToBoxAdapter(
            child: SizedBox(
              height: 38,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 16),
                itemCount: _cities.length,
                separatorBuilder: (_, __) => const SizedBox(width: 8),
                itemBuilder: (context, index) {
                  final city = _cities[index];
                  final isSelected = _selectedCity == city;
                  return ChoiceChip(
                    label: Text(city),
                    selected: isSelected,
                    selectedColor: AppColors.primary,
                    backgroundColor: AppColors.panel,
                    labelStyle: AppTypography.bodySmall.copyWith(
                      color: isSelected ? Colors.white : AppColors.textSecondary,
                      fontWeight: isSelected ? FontWeight.w700 : FontWeight.w400,
                    ),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(20),
                      side: BorderSide(
                        color: isSelected ? AppColors.primary : AppColors.cardBorder,
                      ),
                    ),
                    onSelected: (_) => setState(() => _selectedCity = city),
                  );
                },
              ),
            ),
          ),

          const SliverToBoxAdapter(child: SizedBox(height: 10)),

          // Category Chips Filter
          SliverToBoxAdapter(
            child: SizedBox(
              height: 38,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 16),
                itemCount: _categories.length,
                separatorBuilder: (_, __) => const SizedBox(width: 8),
                itemBuilder: (context, index) {
                  final category = _categories[index];
                  final isSelected = _selectedCategory == category;
                  return ChoiceChip(
                    label: Text(category),
                    selected: isSelected,
                    selectedColor: AppColors.cardBorder,
                    backgroundColor: AppColors.card,
                    labelStyle: AppTypography.telemetryLabel.copyWith(
                      color: isSelected ? AppColors.primary : AppColors.textMuted,
                      fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                    ),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                      side: BorderSide(
                        color: isSelected ? AppColors.primary : AppColors.cardBorder,
                      ),
                    ),
                    onSelected: (_) => setState(() => _selectedCategory = category),
                  );
                },
              ),
            ),
          ),

          const SliverToBoxAdapter(child: SizedBox(height: 16)),

          // Results Count
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Text(
                'LIVE QUEUES NEAR YOU (${filteredBranches.length})',
                style: AppTypography.telemetryLabel.copyWith(letterSpacing: 1.2),
              ),
            ),
          ),

          const SliverToBoxAdapter(child: SizedBox(height: 8)),

          // Branch Cards List
          if (filteredBranches.isEmpty)
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.all(40),
                child: Center(
                  child: Text(
                    'No branches found matching your filters.',
                    style: AppTypography.bodyMedium.copyWith(color: AppColors.textMuted),
                  ),
                ),
              ),
            )
          else
            SliverList(
              delegate: SliverChildBuilderDelegate(
                (context, index) {
                  final branch = filteredBranches[index];
                  return BranchCard(
                    branch: branch,
                    onJoinQueue: () => _openJoinQueueSheet(branch),
                  );
                },
                childCount: filteredBranches.length,
              ),
            ),

          const SliverToBoxAdapter(child: SizedBox(height: 32)),
        ],
      ),
    );
  }
}
