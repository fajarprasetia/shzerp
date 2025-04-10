import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { BUDGET_CATEGORIES } from "@/types/finance";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { date } = body;

    if (!date) {
      return new NextResponse("Date is required", { status: 400 });
    }

    const reportDate = new Date(date);
    
    // Define date ranges
    const currentPeriod = {
      start: startOfMonth(reportDate),
      end: endOfMonth(reportDate)
    };
    
    const previousPeriod = {
      start: startOfMonth(subMonths(reportDate, 1)),
      end: endOfMonth(subMonths(reportDate, 1))
    };

    // Fetch budgets
    const budgets = await prisma.budget.findMany({
      where: {
        OR: [
          {
            startDate: {
              lte: currentPeriod.end
            },
            endDate: {
              gte: currentPeriod.start
            }
          },
          {
            isRecurring: true
          }
        ]
      }
    });

    // Fetch transactions for current and previous periods
    const transactions = await prisma.transaction.findMany({
      where: {
        date: {
          gte: previousPeriod.start,
          lte: currentPeriod.end
        },
        type: "expense"
      }
    });

    // Filter transactions by period
    const currentTransactions = transactions.filter(t => 
      isWithinInterval(new Date(t.date), { 
        start: currentPeriod.start, 
        end: currentPeriod.end 
      })
    );
    
    const previousTransactions = transactions.filter(t => 
      isWithinInterval(new Date(t.date), { 
        start: previousPeriod.start, 
        end: previousPeriod.end 
      })
    );

    // Calculate variance for each category
    const categories = Object.keys(BUDGET_CATEGORIES).map(category => {
      // Current period calculations
      const categoryBudgets = budgets.filter(b => b.category === category);
      const budgeted = categoryBudgets.reduce((sum, b) => sum + b.amount, 0);
      
      const categoryTransactions = currentTransactions.filter(
        t => t.category === category
      );
      const actual = categoryTransactions.reduce((sum, t) => sum + t.amount, 0);
      
      // Previous period calculations
      const previousCategoryTransactions = previousTransactions.filter(
        t => t.category === category
      );
      const previousActual = previousCategoryTransactions.reduce((sum, t) => sum + t.amount, 0);
      const previousVariance = budgeted - previousActual;
      
      // Calculate variance
      const variance = budgeted - actual;
      const variancePercent = budgeted > 0 ? (variance / budgeted) * 100 : 0;
      
      // Determine trend
      let trend: 'improving' | 'worsening' | 'stable' = 'stable';
      if (Math.abs(variance - previousVariance) > budgeted * 0.05) { // 5% threshold for significance
        trend = variance > previousVariance ? 'improving' : 'worsening';
      }
      
      return {
        category,
        categoryName: BUDGET_CATEGORIES[category]?.label || category,
        budgeted,
        actual,
        variance,
        variancePercent,
        trend,
        previousVariance
      };
    }).filter(c => c.budgeted > 0 || c.actual > 0);

    // Calculate totals
    const totalBudgeted = categories.reduce((sum, c) => sum + c.budgeted, 0);
    const totalActual = categories.reduce((sum, c) => sum + c.actual, 0);
    const totalVariance = totalBudgeted - totalActual;
    const totalVariancePercent = totalBudgeted > 0 ? (totalVariance / totalBudgeted) * 100 : 0;
    
    // Generate recommendations
    const recommendations = [];
    
    // Overall budget status
    if (totalVariance < 0) {
      recommendations.push({
        type: 'warning',
        title: 'Overall Budget Deficit',
        description: `You're over budget by ${Math.abs(totalVariancePercent).toFixed(1)}%.`,
        action: 'Review your spending in the categories with the largest negative variances.'
      });
    } else if (totalVariancePercent > 20) {
      recommendations.push({
        type: 'info',
        title: 'Significant Underspending',
        description: `You're under budget by ${totalVariancePercent.toFixed(1)}%.`,
        action: 'Consider reallocating funds to other priorities or adjusting future budgets.'
      });
    }
    
    // Categories with significant overspending
    const worstCategories = categories
      .filter(c => c.variance < 0 && c.variancePercent < -10)
      .slice(0, 3);
    
    if (worstCategories.length > 0) {
      recommendations.push({
        type: 'warning',
        title: 'Categories with Significant Overspending',
        description: `${worstCategories.map(c => c.categoryName).join(', ')}`,
        action: 'Analyze these categories to identify unexpected expenses and adjust your budget accordingly.'
      });
    }
    
    // Categories with improving trends
    const improvingCategories = categories
      .filter(c => c.trend === 'improving')
      .slice(0, 3);
    
    if (improvingCategories.length > 0) {
      recommendations.push({
        type: 'success',
        title: 'Improving Budget Performance',
        description: `${improvingCategories.map(c => c.categoryName).join(', ')}`,
        action: 'Continue the strategies that have helped improve these categories.'
      });
    }
    
    // Categories with worsening trends
    const worseningCategories = categories
      .filter(c => c.trend === 'worsening')
      .slice(0, 3);
    
    if (worseningCategories.length > 0) {
      recommendations.push({
        type: 'warning',
        title: 'Worsening Budget Performance',
        description: `${worseningCategories.map(c => c.categoryName).join(', ')}`,
        action: 'Investigate what changed in these categories and take corrective action.'
      });
    }

    // Prepare report data
    const reportData = {
      period: format(reportDate, 'MMMM yyyy'),
      totalBudgeted,
      totalActual,
      totalVariance,
      totalVariancePercent,
      categories,
      recommendations,
      status: totalVariance >= 0 ? 'under' : 'over',
      overBudget: categories.filter(c => c.variance < 0).length,
      nearBudget: categories.filter(c => c.variance >= 0 && c.variancePercent < 10).length,
      underBudget: categories.filter(c => c.variancePercent >= 10).length,
    };

    return NextResponse.json(reportData);
  } catch (error) {
    console.error("[BUDGET_VARIANCE_REPORT]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
} 