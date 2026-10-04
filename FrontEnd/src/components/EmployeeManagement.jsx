import React, { useState, useEffect } from "react";
import axios from "axios";
import { Search, Filter, RotateCcw } from "lucide-react";

const EmployeeManagement = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);

  // State quản lý bộ lọc
  const [filters, setFilters] = useState({
    keyword: "",
    role: "all",
    status: "all",
  });

  // Hàm gọi API lấy danh sách nhân viên
  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const response = await axios.get("/api/employees", {
        params: {
          keyword: filters.keyword,
          role: filters.role,
          status: filters.status,
        },
      });
      if (response.data.success) {
        setEmployees(response.data.data);
      }
    } catch (error) {
      console.error("Lỗi tải danh sách nhân viên:", error);
    } finally {
      setLoading(false);
    }
  };

  // Tự động gọi lại API khi thay đổi bộ lọc (Sử dụng debounce cho keyword nếu cần)
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchEmployees();
    }, 300); // Trễ 300ms để tránh spam API khi gõ phím

    return () => clearTimeout(timer);
  }, [filters]);

  // Thay đổi giá trị các ô input/select
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Reset bộ lọc
  const handleResetFilters = () => {
    setFilters({
      keyword: "",
      role: "all",
      status: "all",
    });
  };

  return (
    <div className="employee-container p-4">
      {/* KHU VỰC BỘ LỌC VÀ TÌM KIẾM */}
      <div className="filter-bar flex flex-wrap gap-3 mb-4 items-center bg-white p-3 rounded-lg shadow-sm">
        {/* Search Box */}
        <div className="relative flex-1 min-w-[200px]">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            size={18}
          />
          <input
            type="text"
            name="keyword"
            value={filters.keyword}
            onChange={handleFilterChange}
            placeholder="Tìm theo tên hoặc số điện thoại..."
            className="w-full pl-9 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Filter Chức vụ */}
        <div className="w-44">
          <select
            name="role"
            value={filters.role}
            onChange={handleFilterChange}
            className="w-full py-2 px-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Tất cả chức vụ</option>
            <option value="manager">Quản lý</option>
            <option value="cashier">Thu ngân</option>
            <option value="barista">Pha chế</option>
            <option value="waiter">Phục vụ</option>
          </select>
        </div>

        {/* Filter Trạng thái */}
        <div className="w-44">
          <select
            name="status"
            value={filters.status}
            onChange={handleFilterChange}
            className="w-full py-2 px-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Đang làm việc</option>
            <option value="inactive">Đã nghỉ việc</option>
          </select>
        </div>

        {/* Nút Reset bộ lọc */}
        <button
          onClick={handleResetFilters}
          className="flex items-center gap-1 px-3 py-2 border rounded-md hover:bg-gray-100 text-gray-600"
          title="Đặt lại bộ lọc"
        >
          <RotateCcw size={16} />
          <span>Làm mới</span>
        </button>
      </div>

      {/* BẢNG DANH SÁCH NHÂN VIÊN */}
      <div className="table-wrapper bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="p-3 font-semibold">STT</th>
              <th className="p-3 font-semibold">Họ và tên</th>
              <th className="p-3 font-semibold">Số điện thoại</th>
              <th className="p-3 font-semibold">Chức vụ</th>
              <th className="p-3 font-semibold">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="5" className="text-center p-4">
                  Đang tải dữ liệu...
                </td>
              </tr>
            ) : employees.length > 0 ? (
              employees.map((emp, index) => (
                <tr key={emp.id} className="border-b hover:bg-gray-50">
                  <td className="p-3">{index + 1}</td>
                  <td className="p-3 font-medium">{emp.name}</td>
                  <td className="p-3">{emp.phone}</td>
                  <td className="p-3">
                    <span className="capitalize px-2 py-1 bg-blue-50 text-blue-600 rounded text-sm">
                      {emp.role}
                    </span>
                  </td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-1 rounded text-sm ${
                        emp.status === "active"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {emp.status === "active" ? "Đang làm" : "Đã nghỉ"}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="text-center p-4 text-gray-500">
                  Không tìm thấy nhân viên nào phù hợp.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default EmployeeManagement;
