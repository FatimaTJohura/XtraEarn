const assert = require('assert');

async function testEnterpriseAnalytics() {
  console.log('================ VERIFYING COMPLETE ENTERPRISE ANALYTICS SUITE ================');

  // 1. Authenticate as Super Admin
  const loginRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@xtraearn.com', password: 'Password123!' })
  }).then(r => r.json());

  assert(loginRes.token, 'Admin login failed');
  const authHeader = { 'Authorization': `Bearer ${loginRes.token}` };
  console.log('✅ Admin authenticated:', loginRes.user.email);

  // 2. Financial Reports Analytics
  const finRes = await fetch('http://localhost:3000/api/admin/analytics/financial-reports', { headers: authHeader }).then(r => r.json());
  assert(finRes.gross_volume >= 1000000, 'Gross volume calculation invalid');
  assert(finRes.net_platform_profit > 0, 'Net profit calculation invalid');
  assert(finRes.gateway_breakdown && finRes.gateway_breakdown.length === 4, 'Gateway breakdown missing');
  assert(finRes.ledger_breakdown && finRes.ledger_breakdown.length >= 6, 'General ledger breakdown missing');
  console.log(`✅ Financial Analytics: ৳${finRes.gross_volume.toLocaleString()} GMV, ৳${finRes.net_platform_profit.toLocaleString()} Profit, 4 Payment Rails, ${finRes.ledger_breakdown.length} months audited.`);

  // 3. User Cohort & Behavioral Analytics
  const cohortRes = await fetch('http://localhost:3000/api/admin/analytics/user-cohorts', { headers: authHeader }).then(r => r.json());
  assert(cohortRes.total_users >= 10, 'Total users missing in cohort analytics');
  assert(cohortRes.cohort_matrix && cohortRes.cohort_matrix.length >= 5, 'Cohort matrix missing');
  assert(cohortRes.regional_distribution && cohortRes.regional_distribution.length >= 6, 'Regional distribution missing');
  console.log(`✅ User Cohort Analytics: ${cohortRes.mau.toLocaleString()} MAU, ${cohortRes.dau_mau_ratio} DAU/MAU, ${cohortRes.cohort_matrix.length} cohorts, ${cohortRes.regional_distribution.length} divisions.`);

  // 4. Task Velocity & Category Demand
  const velRes = await fetch('http://localhost:3000/api/admin/analytics/task-velocity', { headers: authHeader }).then(r => r.json());
  assert(velRes.avg_time_to_first_bid, 'Avg time to first bid missing');
  assert(velRes.category_liquidity && velRes.category_liquidity.length >= 6, 'Category liquidity list missing');
  console.log(`✅ Task Velocity Analytics: ${velRes.avg_time_to_first_bid} first bid, ${velRes.avg_time_to_hire} time to hire, ${velRes.overall_completion_rate} fulfillment.`);

  // 5. GMV & Take Rate Analytics
  const gmvRes = await fetch('http://localhost:3000/api/admin/analytics/gmv-take-rate', { headers: authHeader }).then(r => r.json());
  assert(gmvRes.current_monthly_gmv > 0, 'Current monthly GMV missing');
  assert(gmvRes.revenue_streams && gmvRes.revenue_streams.length === 4, 'Revenue streams missing');
  assert(gmvRes.trendline && gmvRes.trendline.length >= 12, '12-Month GMV forecast trendline missing');
  console.log(`✅ GMV & Take Rate Analytics: ৳${gmvRes.current_monthly_gmv.toLocaleString()} monthly GMV, ${gmvRes.effective_take_rate} take rate, ${gmvRes.trendline.length} forecast points.`);

  // 6. Worker Productivity & Earnings Distribution Analytics
  const wrkRes = await fetch('http://localhost:3000/api/admin/analytics/worker', { headers: authHeader }).then(r => r.json());
  assert(wrkRes.total_workers > 0, 'Total workers missing');
  assert(wrkRes.earnings_brackets && wrkRes.earnings_brackets.length === 4, 'Earnings brackets missing');
  assert(wrkRes.top_earners && wrkRes.top_earners.length > 0, 'Top earners leaderboard missing');
  console.log(`✅ Worker Analytics: ${wrkRes.total_workers.toLocaleString()} total workers, ${wrkRes.median_monthly_earnings} median, ${wrkRes.top_earners.length} talent leaders.`);

  // 7. Client Spending & Repeat Hiring Analytics
  const cliRes = await fetch('http://localhost:3000/api/admin/analytics/client', { headers: authHeader }).then(r => r.json());
  assert(cliRes.total_clients > 0, 'Total clients missing');
  assert(cliRes.segments && cliRes.segments.length === 4, 'Client segments missing');
  assert(cliRes.top_clients && cliRes.top_clients.length > 0, 'Top clients list missing');
  console.log(`✅ Client Analytics: ${cliRes.total_clients.toLocaleString()} clients, ${cliRes.repeat_hire_rate} repeat rate, ${cliRes.top_clients.length} top hirers.`);

  // 8. Category Performance & Liquidity Matrix Analytics
  const catRes = await fetch('http://localhost:3000/api/admin/analytics/category', { headers: authHeader }).then(r => r.json());
  assert(catRes.total_categories > 0, 'Total categories missing');
  assert(catRes.category_matrix && catRes.category_matrix.length >= 6, 'Category matrix missing');
  console.log(`✅ Category Analytics: ${catRes.total_categories} categories, ${catRes.category_matrix.length} benchmarked sectors.`);

  // 9. Marketplace Conversion Funnel Analytics
  const cnvRes = await fetch('http://localhost:3000/api/admin/analytics/conversion', { headers: authHeader }).then(r => r.json());
  assert(cnvRes.funnel && cnvRes.funnel.length === 5, 'Funnel stages missing');
  assert(cnvRes.types_conversion && cnvRes.types_conversion.length === 3, 'Types conversion missing');
  console.log(`✅ Conversion Analytics: ${cnvRes.funnel_overall_conversion} fulfillment rate, 5 funnel stages, 3 modalities.`);

  // 10. User Retention Decay Curves & LTV Analytics
  const retRes = await fetch('http://localhost:3000/api/admin/analytics/retention', { headers: authHeader }).then(r => r.json());
  assert(retRes.decay_curve && retRes.decay_curve.length === 7, 'Decay curve missing');
  assert(retRes.repeat_frequencies && retRes.repeat_frequencies.length === 4, 'Repeat frequencies missing');
  console.log(`✅ Retention Analytics: ${retRes.month_1_retention} M1 retention, ${retRes.ltv_cac_ratio} LTV/CAC ratio, 7 decay points.`);

  // 11. CSV Export Endpoints
  const expFin = await fetch('http://localhost:3000/api/admin/analytics/export/financial', { headers: authHeader }).then(r => r.text());
  assert(expFin.includes('Accounting Month') || expFin.includes('Month'), 'Financial CSV export failed');
  
  const expCoh = await fetch('http://localhost:3000/api/admin/analytics/export/cohorts', { headers: authHeader }).then(r => r.text());
  assert(expCoh.includes('Cohort') && expCoh.includes('Day 30'), 'Cohort CSV export failed');

  const expVel = await fetch('http://localhost:3000/api/admin/analytics/export/task-velocity', { headers: authHeader }).then(r => r.text());
  assert(expVel.includes('Liquidity Score'), 'Velocity CSV export failed');

  const expGmv = await fetch('http://localhost:3000/api/admin/analytics/export/gmv', { headers: authHeader }).then(r => r.text());
  assert(expGmv.includes('Projected GMV'), 'GMV CSV export failed');
  console.log('✅ CSV Export Rails: All 4 analytics CSV export streams verified.');

  console.log('\n🎉 ALL 9 ENTERPRISE PLATFORM ANALYTICS ENGINES FULLY VERIFIED & 100% OPERATIONAL!');
}

testEnterpriseAnalytics().catch(err => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
