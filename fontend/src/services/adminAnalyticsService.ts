import { dataService } from './dataService';

export interface DashboardSummary {
  sales: { value: number; change: number };
  orders: { value: number; change: number };
  customers: { value: number; newThisMonth: number };
  cr: { value: number; change: number };
}

export interface RevenueSeries {
  month: string;
  inStore: number;
  online: number;
}

export interface ProductItem {
  id: string | number;
  productId: string;
  productName: string;
  name: string;
  image: string;
  soldCount: number;
  quantitySold: number;
  price: number;
  effectivePrice: number;
}

export interface BranchPerformance {
  id: number;
  name: string;
  score: number; // percentage
  sales: number;
}

export interface SupportOverview {
  open: number;
  urgent: number;
  resolved: number;
  waiting: number;
}

export interface RecentOrder {
  id: string; // e.g. #ORD-9021
  customerName: string;
  amount: number;
  status: string;
}

export const adminAnalyticsService = {
  // Mock async fetching
  async getDashboardData(timeFilter?: string, branchId?: string) {
    // 1. Fetch raw data via dataService
    const [ordersRaw, usersRaw, productsRaw, branchesRaw, ticketsRaw] = await Promise.all([
      dataService.getOrders(),
      dataService.getUsers(),
      dataService.getProducts(),
      dataService.getBranches(),
      dataService.getSupportTickets?.() || Promise.resolve([]),
    ]);

    // Fallbacks
    const orders = ordersRaw || [];
    const users = usersRaw || [];
    const products = productsRaw || [];
    const branches = branchesRaw || [];
    const tickets = ticketsRaw || [];

    // Filter orders by timeFilter (demo mapping)
    const now = new Date();
    const filteredOrders = orders.filter((o: any) => {
      // Lọc theo chi nhánh nếu được truyền vào (Branch-Awareness)
      if (branchId && branchId !== 'all' && o.branch_id !== branchId) {
        return false;
      }

      if (!timeFilter || !o.created_at) return true;
      const orderDate = new Date(o.created_at);
      if (isNaN(orderDate.getTime())) return true; // Invalid date fallback

      if (timeFilter === 'today') {
        return orderDate.toDateString() === now.toDateString();
      } else if (timeFilter === '7d') {
        const past7 = new Date(); past7.setDate(now.getDate() - 7);
        return orderDate >= past7;
      } else if (timeFilter === '30d') {
        const past30 = new Date(); past30.setDate(now.getDate() - 30);
        return orderDate >= past30;
      }
      return true;
    });

    // 2. Compute KPIs from filtered orders (excluding CANCELLED and REFUNDED for revenue)
    const revenueOrders = filteredOrders.filter((o: any) => o.status !== 'CANCELLED' && o.status !== 'REFUNDED');
    const totalSales = revenueOrders.reduce((sum: number, o: any) => sum + (Number(o.total_amount) || 0), 0);
    const totalOrders = filteredOrders.length;
    const totalCustomers = users.filter((u: any) => u.role_id !== 1).length; // Exclude superadmins
    // Mock change % since mockData corresponds mostly to one period
    const mockSalesChange = timeFilter === 'today' ? 2.1 : timeFilter === '7d' ? 8.4 : 12.4; 
    const mockOrdersChange = timeFilter === 'today' ? 1.2 : timeFilter === '7d' ? 5.2 : 8.2;
    const mockNewCustomers = Math.max(1, Math.floor(totalCustomers * (timeFilter === 'today' ? 0.01 : timeFilter === '7d' ? 0.05 : 0.15)));

    const crValue = orders.length > 0 ? ((orders.length / totalCustomers) * 10).toFixed(2) : 0; 
    
    const summary: DashboardSummary = {
      sales: { value: totalSales, change: mockSalesChange },
      orders: { value: totalOrders, change: mockOrdersChange },
      customers: { value: totalCustomers, newThisMonth: mockNewCustomers },
      cr: { value: Number(crValue), change: -0.4 },
    };

    // 3. Compute Revenue Series (mock mapping based on existing orders for demo)
    // Distribute total sales artificially across 7 months to have a nice chart
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL'];
    const revenueSeries: RevenueSeries[] = months.map((m, i) => {
      const isOnline = i % 2 !== 0;
      const amount = Math.floor(totalSales > 0 ? (totalSales / months.length) * (0.5 + Math.random()) : Math.random() * 100000);
      return {
        month: m,
        inStore: !isOnline ? amount : amount * 0.4,
        online: isOnline ? amount : amount * 0.4,
      };
    });

    // 4. Compute Recent Orders
    const recentOrders: RecentOrder[] = filteredOrders
      .sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
      .slice(0, 5)
      .map((o: any) => {
        // Compare as strings so MongoDB ObjectId matches work
        const userId = String(o.user_id || '');
        const user = users.find((u: any) => String(u.id || u._id || '') === userId);
        return {
          id: `#ORD-${String(o.id || o._id || '').slice(-8)}`,
          customerName: user ? (user.full_name || user.username || '') : '',
          amount: o.total_amount || 0,
          status: o.status || 'PENDING'
        };
      });

    // 5. Compute Top Products
    const topProducts: ProductItem[] = products
      .map((p: any) => {
        const resolvedPrice = p.effective_price ?? p.price ?? p.original_price ?? 0;
        return {
          id: p.id || p.product_id || p._id || '',
          productId: p.id || p.product_id || p._id || '',
          productName: p.name || '',
          name: p.name || '',
          price: resolvedPrice,
          effectivePrice: resolvedPrice,
          image: p.image || (Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : ''),
          soldCount: p.sold_count || 0,
          quantitySold: p.sold_count || 0
        };
      })
      .sort((a: any, b: any) => b.quantitySold - a.quantitySold)
      .slice(0, 5);

    // 6. Branch Performance
    // Calculate total sales per branch (excluding CANCELLED and REFUNDED)
    const branchSales = new Map<number, number>();
    revenueOrders.forEach((o: any) => {
      const bId = Number(o.branch_id);
      if (bId) {
        branchSales.set(bId, (branchSales.get(bId) || 0) + Number(o.total_amount || 0));
      }
    });

    const maxSales = Math.max(...Array.from(branchSales.values()), 1);

    const topBranches: BranchPerformance[] = branches
      .map((b: any) => {
        const branchId = Number(b.id) || 0;
        const sales = branchSales.get(branchId) || 0; 
        return {
          id: branchId,
          name: b.name || `Branch ${branchId}`,
          sales: sales,
          score: sales > 0 ? Math.floor((sales / maxSales) * 100) : 0
        };
      })
      .sort((a: any, b: any) => b.sales - a.sales)
      .slice(0, 3);

    // 7. Support Overview
    let open = 0, urgent = 0, resolved = 0, waiting = 0;
    if (tickets && tickets.length > 0) {
      tickets.forEach((t: any) => {
        const status = (t.status || '').toUpperCase();
        if (status === 'OPEN') open++;
        else if (status === 'RESOLVED' || status === 'CLOSED') resolved++;
        else waiting++;

        if (t.priority === 'HIGH') urgent++;
      });
    }

    const support: SupportOverview = { open, urgent, resolved, waiting };

    // 8. Compute Order Status Breakdown
    const statusCounts: Record<string, number> = {};
    filteredOrders.forEach((o: any) => {
      const status = o.status || 'PENDING';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    return {
      summary,
      revenueSeries,
      recentOrders,
      topProducts,
      topBranches,
      support,
      statusCounts
    };
  }
};
