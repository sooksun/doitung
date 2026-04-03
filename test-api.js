// test-api.js
// Script สำหรับทดสอบ API endpoints

const fetch = require('node-fetch');

// Try to detect port from environment or default to 3000/3001
const API_BASE = process.env.API_BASE || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

async function testAPI() {
  console.log('🧪 เริ่มทดสอบ API...\n');
  console.log('API Base:', API_BASE);
  console.log('='.repeat(50));

  try {
    // 1. Test Login
    console.log('\n1️⃣ ทดสอบ Login...');
    const loginRes = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@local',
        password: 'Admin123',
      }),
    });

    // Check response status
    if (!loginRes.ok) {
      console.error(`❌ Login failed: HTTP ${loginRes.status} ${loginRes.statusText}`);
      
      // Try to read error message
      try {
        const errorText = await loginRes.text();
        console.error('   Response:', errorText.substring(0, 200));
      } catch (e) {
        console.error('   Could not read response body');
      }
      
      if (loginRes.status === 404) {
        console.error('\n⚠️  Server might not be running or route does not exist');
        console.error('   Try: npm run dev');
      }
      return;
    }
    
    const loginData = await loginRes.json();
    
    if (!loginData.success) {
      console.error('❌ Login failed:', loginData.error || loginData.message);
      return;
    }

    console.log('✅ Login สำเร็จ!');
    console.log('   User:', loginData.data.user.name);
    console.log('   Email:', loginData.data.user.email);
    console.log('   Roles:', loginData.data.user.roles.join(', '));
    
    const token = loginData.data.token;
    if (!token) {
      console.error('❌ ไม่พบ token!');
      return;
    }

    console.log('   Token:', token.substring(0, 50) + '...');

    // 2. Test Get Current User
    console.log('\n2️⃣ ทดสอบ Get Current User...');
    const meRes = await fetch(`${API_BASE}/api/auth/me`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const meData = await meRes.json();
    
    if (meData.success) {
      console.log('✅ Get Current User สำเร็จ!');
      console.log('   Name:', meData.data.name);
      console.log('   Email:', meData.data.email);
    } else {
      console.error('❌ Get Current User failed:', meData.error);
    }

    // 3. Test Get Instruments
    console.log('\n3️⃣ ทดสอบ Get Instruments...');
    const instrumentsRes = await fetch(`${API_BASE}/api/instruments`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    
    if (!instrumentsRes.ok) {
      console.error(`❌ Get Instruments failed: HTTP ${instrumentsRes.status}`);
      return;
    }
    
    const instrumentsData = await instrumentsRes.json();
    
    if (instrumentsData && instrumentsData.success && instrumentsData.data) {
      const items = instrumentsData.data.items || instrumentsData.data;
      const count = Array.isArray(items) ? items.length : (instrumentsData.data.total || 0);
      console.log(`✅ Get Instruments สำเร็จ! (${count} instruments)`);
      
      if (Array.isArray(items)) {
        items.slice(0, 5).forEach((inst, idx) => {
          console.log(`   ${idx + 1}. ${inst.nameTh} (${inst.type})`);
        });
        if (items.length > 5) {
          console.log(`   ... และอีก ${items.length - 5} รายการ`);
        }
      }
    } else {
      console.error('❌ Get Instruments failed:', instrumentsData);
    }

    // 4. Test Get OKRs
    console.log('\n4️⃣ ทดสอบ Get OKRs...');
    const okrsRes = await fetch(`${API_BASE}/api/okrs/objectives`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    
    if (!okrsRes.ok) {
      console.error(`❌ Get OKRs failed: HTTP ${okrsRes.status}`);
      return;
    }
    
    const okrsData = await okrsRes.json();
    
    if (okrsData && okrsData.success && okrsData.data) {
      const items = okrsData.data.items || okrsData.data;
      const count = Array.isArray(items) ? items.length : (okrsData.data.total || 0);
      console.log(`✅ Get OKRs สำเร็จ! (${count} objectives)`);
      
      if (Array.isArray(items)) {
        items.forEach((okr, idx) => {
          console.log(`   ${idx + 1}. ${okr.title}`);
          console.log(`      Progress: ${okr.progress?.toFixed(1) || 0}%`);
          console.log(`      Key Results: ${okr.keyResultsCount || 0}`);
          if (okr.dimension) {
            console.log(`      Dimension: ${okr.dimension}`);
          }
        });
      }
    } else {
      console.error('❌ Get OKRs failed:', okrsData);
    }

    // 5. Test Get Actions (ถ้ามี KR)
    if (okrsData && okrsData.success && okrsData.data) {
      const items = okrsData.data.items || okrsData.data;
      if (Array.isArray(items) && items.length > 0) {
        const firstOkr = items[0];
        if (firstOkr.keyResultsCount > 0) {
          console.log('\n5️⃣ ทดสอบ Get Actions...');
          // ต้องดึง KR ก่อน
          const krRes = await fetch(
            `${API_BASE}/api/okrs/objectives/${firstOkr.id}/key-results`,
            {
              headers: { 'Authorization': `Bearer ${token}` },
            }
          );
          
          if (krRes.ok) {
            const krData = await krRes.json();
            const krItems = (krData && krData.success && krData.data) ? (krData.data.items || krData.data) : (Array.isArray(krData) ? krData : []);
            
            if (Array.isArray(krItems) && krItems.length > 0) {
              const firstKr = krItems[0];
              const actionsRes = await fetch(
                `${API_BASE}/api/okrs/key-results/${firstKr.id}/actions`,
                {
                  headers: { 'Authorization': `Bearer ${token}` },
                }
              );
              
              if (actionsRes.ok) {
                const actionsData = await actionsRes.json();
                const actionItems = (actionsData && actionsData.success && actionsData.data) ? (actionsData.data.items || actionsData.data) : (Array.isArray(actionsData) ? actionsData : []);
                
                if (Array.isArray(actionItems)) {
                  console.log(`✅ Get Actions สำเร็จ! (${actionItems.length} actions)`);
                  actionItems.forEach((action, idx) => {
                    console.log(`   ${idx + 1}. ${action.title}`);
                    if (action.averageCurrentState !== undefined) {
                      console.log(`      Current State: ${action.averageCurrentState.toFixed(1)}`);
                    }
                    if (action.averageDesiredState !== undefined) {
                      console.log(`      Desired State: ${action.averageDesiredState.toFixed(1)}`);
                    }
                  });

                  // 6. Test Action Ratings (ถ้ามี Action)
                  if (actionItems.length > 0) {
                    const firstAction = actionItems[0];
                    console.log('\n6️⃣ ทดสอบ Get Action Ratings...');
                    const ratingsRes = await fetch(
                      `${API_BASE}/api/okrs/actions/${firstAction.id}/ratings`,
                      {
                        headers: { 'Authorization': `Bearer ${token}` },
                      }
                    );
                    
                    if (ratingsRes.ok) {
                      const ratingsData = await ratingsRes.json();
                      const ratingItems = (ratingsData && ratingsData.success && ratingsData.data) ? (ratingsData.data.items || ratingsData.data) : (Array.isArray(ratingsData) ? ratingsData : []);
                      
                      if (Array.isArray(ratingItems) && ratingItems.length > 0) {
                        console.log(`✅ Get Action Ratings สำเร็จ! (${ratingItems.length} ratings)`);
                        ratingItems.forEach((rating, idx) => {
                          console.log(`   ${idx + 1}. Current: ${rating.currentState}, Desired: ${rating.desiredState}`);
                          if (rating.comment) {
                            console.log(`      Comment: ${rating.comment.substring(0, 50)}...`);
                          }
                        });
                      } else {
                        console.log('⚠️  ยังไม่มี Action Ratings');
                      }
                    } else {
                      console.log('⚠️  ไม่สามารถดึง Action Ratings ได้');
                    }
                  }
                }
              }
            }
          }
        }
      }
    }

    // 7. Test Dashboard
    console.log('\n7️⃣ ทดสอบ Dashboard API...');
    const dashboardRes = await fetch(`${API_BASE}/api/dashboard/summary`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const dashboardData = await dashboardRes.json();
    
    if (dashboardData && dashboardData.success) {
      console.log('✅ Dashboard API สำเร็จ!');
      console.log('   Completion Rate:', dashboardData.data.completionRate + '%');
      console.log('   Quality Index:', dashboardData.data.overallQualityIndex + '%');
    } else {
      console.error('❌ Dashboard API failed:', dashboardData);
    }

    // 8. Test Q-Model
    console.log('\n8️⃣ ทดสอบ Q-Model API...');
    const qModelRes = await fetch(`${API_BASE}/api/dashboard/q-model`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const qModelData = await qModelRes.json();
    
    if (qModelData && qModelData.success && qModelData.data.dimensionProgress) {
      console.log('✅ Q-Model API สำเร็จ!');
      qModelData.data.dimensionProgress.forEach((dim) => {
        console.log(`   ${dim.labelTh}: ${dim.current}/${dim.target} (${dim.progress}%) - ${dim.status}`);
      });
    } else {
      console.error('❌ Q-Model API failed:', qModelData);
    }

    console.log('\n' + '='.repeat(50));
    console.log('✅ ทดสอบ API เสร็จสิ้น!');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run test
testAPI();

