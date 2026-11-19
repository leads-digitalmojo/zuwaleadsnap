const fs = require('fs');
const path = require('path');

const apis = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'leadsnap-rea', 'captures', 'share_view', 'intercepted_apis.json'), 'utf8'));
const heatmap = JSON.parse(apis[15].body);
const competitors = JSON.parse(apis[17].body);

const d = heatmap.public_heatmap_data;
console.log('=== LEADSNAP SCAN SPECIFICATION (From Live Capture 1581314) ===');
console.log('ID:', d.id);
console.log('Business Name:', d.business_name);
console.log('Business Place ID:', d.business_place_id);
console.log('Keyword:', d.keyword);
console.log('Grid Size:', d.grid_size, `(${d.grid_size}x${d.grid_size} = ${d.grid_size * d.grid_size})`);
console.log('Distance Measure:', d.grid_distance_measure, '| Distance:', d.grid_point_distance);
console.log('Center Lat/Lng:', d.grid_center_lat, d.grid_center_lng);
console.log('Status:', d.status, '| Status Code:', d.status_code);
console.log('Average Rank (AGR):', d.average);
console.log('ATGR:', d.top_n);
console.log('Total Points:', d.total_points);
console.log('Top 3 Points:', d.top_3_points, `(${d.top_3_percentage}%)`);
console.log('Market Share:', d.market_share, '%');
console.log('Area:', d.area);

// Points analysis
const pointsKeys = Object.keys(d).filter(k => Array.isArray(d[k]));
console.log('\nArray fields in scan data:', pointsKeys);

for (const k of pointsKeys) {
  console.log(`Field '${k}' has ${d[k].length} items. Sample item:`);
  console.log(JSON.stringify(d[k][0], null, 2));
}

// Competitors analysis
console.log('\n=== COMPETITORS SUMMARY ===');
console.log('Total Competitors in Scan:', competitors.length);
console.log('Top 5 Competitors:');
competitors.slice(0, 5).forEach((c, idx) => {
  console.log(`${idx + 1}. ${c.place?.name} | Avg Rank: ${c.average} | Top 3 Points: ${c.top_3_points} | Reviews: ${c.place?.review_count} (${c.place?.ave_review_rating}⭐) | Place ID: ${c.place?.google_place_id}`);
});

// Save structured breakdown
const output = {
  scan: d,
  competitors_summary: competitors.slice(0, 10),
  competitors_total: competitors.length
};
fs.writeFileSync(path.join(__dirname, '..', 'leadsnap-rea', 'captures', 'scan_1581314_parsed.json'), JSON.stringify(output, null, 2));
console.log('\nWrote parsed details to leadsnap-rea/captures/scan_1581314_parsed.json');
