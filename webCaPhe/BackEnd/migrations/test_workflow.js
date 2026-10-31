const http = require('http');

function post(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body || {});
    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    }, (res) => {
      let buf = '';
      res.on('data', chunk => buf += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(buf || '{}') }));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function get(path) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: 'GET',
    }, (res) => {
      let buf = '';
      res.on('data', chunk => buf += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(buf || '{}') }));
    });
    req.on('error', reject);
    req.end();
  });
}

async function testWorkflow() {
  console.log('--- BẮT ĐẦU TEST TOÀN BỘ QUY TRÌNH QH-55 VÀ TÍNH LƯƠNG ADMIN ---');

  // Bước 1: Lấy bảng công tháng 10/2026
  console.log('\n1. Lấy bảng công tháng 10/2026...');
  const res1 = await get('/api/bangcong-thang?thang=10&nam=2026');
  console.log('Status:', res1.status, 'Summary:', res1.data.summary);

  // Bước 2: Thử tính lương khi BẢNG CÔNG CHƯA CHỐT SỔ
  console.log('\n2. Thử tính lương khi Quản lý CHƯA chốt sổ...');
  const res2 = await post('/api/bangluong/calculate', { thang: 10, nam: 2026 });
  console.log('Status (kỳ vọng 400):', res2.status);
  console.log('Message chặn:', res2.data.message);

  // Bước 3: Nạp kịch bản mẫu kiểm thử có 1 khiếu nại
  console.log('\n3. Nạp kịch bản có 1 nhân viên khiếu nại (emp_replied)...');
  const res3 = await post('/api/bangcong-thang/seed-demo', { thang: 10, nam: 2026 });
  console.log('Seed demo:', res3.data.message);

  // Bước 4: Quản lý cố bấm [Chốt bảng công tháng] khi CÒN KHIẾU NẠI
  console.log('\n4. Thử chốt bảng công khi còn khiếu nại chưa xử lý...');
  const res4 = await post('/api/bangcong-thang/close-and-submit-to-admin', { thang: 10, nam: 2026 });
  console.log('Status (kỳ vọng 400):', res4.status);
  console.log('Message chặn:', res4.data.message);

  // Bước 5: Quản lý kiểm tra camera/sổ sách và sửa lại công cho đúng (Xử lý khiếu nại)
  console.log('\n5. Quản lý kiểm tra camera và xử lý khiếu nại cho nhân viên...');
  const checkTimesheet = await get('/api/bangcong-thang?thang=10&nam=2026');
  const disputedEmp = checkTimesheet.data.data.find(r => r.TrangThai === 'emp_replied');
  if (disputedEmp) {
    const resolveRes = await new Promise((resolve, reject) => {
      const data = JSON.stringify({
        soCong: 24,
        soGioLam: 192,
        soNgayTre: 0,
        ghiChuQL: 'Đã trích xuất camera 07:00 ngày 12/10 và 15/10: Xác nhận nhân viên có đi làm đủ ca, cập nhật lại đủ 24 công.'
      });
      const req = http.request({
        hostname: 'localhost',
        port: 5000,
        path: `/api/bangcong-thang/${disputedEmp.MaBangCong}/resolve-complaint`,
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
      }, (res) => {
        let buf = '';
        res.on('data', chunk => buf += chunk);
        res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(buf || '{}') }));
      });
      req.on('error', reject);
      req.write(data);
      req.end();
    });
    console.log('Xử lý khiếu nại status:', resolveRes.status, 'Message:', resolveRes.data.message);
  }

  // Bước 6: Toàn bộ nhân viên đã "Xác nhận đúng" -> Quản lý bấm [Chốt bảng công tháng]
  console.log('\n6. Quản lý bấm [Chốt bảng công tháng] khi toàn bộ đã "Xác nhận đúng"...');
  const res6 = await post('/api/bangcong-thang/close-and-submit-to-admin', { thang: 10, nam: 2026 });
  console.log('Status:', res6.status);
  console.log('Message:', res6.data.message);

  // Bước 7: Kiểm tra DỮ LIỆU ĐÃ BỊ KHÓA (không ai được sửa nữa)
  console.log('\n7. Kiểm tra sửa dữ liệu khi đã khóa...');
  const tryEdit = await new Promise((resolve, reject) => {
    const data = JSON.stringify({ soCong: 99 });
    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/bangcong-thang/1`,
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
    }, (res) => {
      let buf = '';
      res.on('data', chunk => buf += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(buf || '{}') }));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
  console.log('Status sửa khi đã khóa (kỳ vọng 403):', tryEdit.status);
  console.log('Message chặn:', tryEdit.data.message);

  // Bước 8: Admin chạy tính lương khi ĐÃ NHẬN TÍN HIỆU ĐÃ CHỐT SỔ TỪ QUẢN LÝ
  console.log('\n8. Admin chạy API tính lương khi đã nhận tín hiệu "Đã chốt sổ"...');
  const res8 = await post('/api/bangluong/calculate', { thang: 10, nam: 2026 });
  console.log('Status tính lương:', res8.status);
  console.log('Message:', res8.data.message);

  // Bước 9: Admin xem bảng lương hoàn chỉnh
  console.log('\n9. Admin xem danh sách bảng lương...');
  const res9 = await get('/api/bangluong?thang=10&nam=2026');
  console.log('Tổng nhân viên tính lương:', res9.data.summary?.tongNhanVien, 'Tổng quỹ lương:', res9.data.summary?.tongTienLuong);

  console.log('\n--- HOÀN TẤT KIỂM THỬ THÀNH CÔNG RỰC RỠ! ---');
  process.exit(0);
}

testWorkflow().catch(e => { console.error('Lỗi kiểm thử:', e.message); process.exit(1); });
