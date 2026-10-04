import React, { useState, useEffect } from "react";
import axios from "axios";
import { Search, RotateCcw, UserPlus, Edit, Trash2 } from "lucide-react";

const EmployeeManagement = ({ currentRole }) => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);

  // State quản lý bộ lọc
  const [filters, setFilters] = useState({
    keyword: "",
    role: "all",
    status: "all",
  });

  // Call API lấy danh sách nhân viên kèm params bộ lọc
  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const response = await axios.get("http://localhost:5000/api/employees", {
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
      console.error("Lỗi khi tải danh sách nhân viên:", error);
    } finally {
      setLoading(false);
    }
  };

  // Tự động gọi API khi bộ lọc thay đổi (Debounce 300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchEmployees();
    }, 300);

    return () => clearTimeout(timer);
  }, [filters]);

  // Xử lý thay đổi ô tìm kiếm và dropdown
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

  // Chuyển đổi tên chức vụ hiển thị
  const renderRoleName = (role) => {
    switch (role) {
      case "manager":
        return "Quản lý";
      case "cashier":
        return "Thu ngân";
      case "barista":
        return "Pha chế";
      case "waiter":
        return "Phục vụ";
      default:
        return role;
    }
  };

  return (
    <div className="employee-management-container p-4">
      <div className="header-actions flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-gray-800">
          Quản lý Nhân sự & Phân quyền
        </h1>
        {currentRole === "manager" || currentRole === "admin" ? (
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center gap-2">
            <UserPlus size={18} />
            <span>Thêm nhân viên mới</span>
          </button>
        ) : null}
      </div>

      {/* THANH BỘ LỌC VÀ TÌM KIẾM */}
      <div className="filter-bar flex flex-wrap gap-3 mb-4 items-center bg-white p-3 rounded-lg shadow-sm border border-gray-100">
        {/* Search Box */}
        <div className="relative flex-1 min-w-[240px]">
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
            className="w-full pl-9 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>

        {/* Filter Chức vụ */}
        <div className="w-44">
          <select
            name="role"
            value={filters.role}
            onChange={handleFilterChange}
            className="w-full py-2 px-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
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
            className="w-full py-2 px-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Đang làm việc</option>
            <option value="inactive">Đã nghỉ việc</option>
          </select>
        </div>

        {/* Nút Làm mới */}
        <button
          onClick={handleResetFilters}
          className="flex items-center gap-1 px-3 py-2 border rounded-md hover:bg-gray-50 text-gray-600 text-sm"
          title="Đặt lại bộ lọc"
        >
          <RotateCcw size={16} />
          <span>Làm mới</span>
        </button>
      </div>

      {/* BẢNG DANH SÁCH NHÂN VIÊN */}
      <div className="table-wrapper bg-white rounded-lg shadow overflow-x-auto border border-gray-200">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b text-gray-700 text-sm">
              <th className="p-3 font-semibold">STT</th>
              <th className="p-3 font-semibold">Họ và tên</th>
              <th className="p-3 font-semibold">Số điện thoại</th>
              <th className="p-3 font-semibold">Chức vụ</th>
              <th className="p-3 font-semibold">Trạng thái</th>
              {(currentRole === "manager" || currentRole === "admin") && (
                <th className="p-3 font-semibold text-center">Thao tác</th>
              )}
            </tr>
          </thead>
          <tbody className="text-sm divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan="6" className="text-center p-6 text-gray-500">
                  Đang tải dữ liệu nhân viên...
                </td>
              </tr>
            ) : employees.length > 0 ? (
              employees.map((emp, index) => (
                <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-3 text-gray-500">{index + 1}</td>
                  <td className="p-3 font-medium text-gray-900">{emp.name}</td>
                  <td className="p-3 text-gray-600">{emp.phone}</td>
                  <td className="p-3">
                    <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                      {renderRoleName(emp.role)}
                    </span>
                  </td>
                  <td className="p-3">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        emp.status === "active"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {emp.status === "active" ? "Đang làm" : "Đã nghỉ"}
                    </span>
                  </td>
                  {(currentRole === "manager" || currentRole === "admin") && (
                    <td className="p-3 text-center">
                      <div className="flex justify-center items-center gap-2">
                        <button className="p-1 text-blue-600 hover:text-blue-800" title="Sửa">
                          <Edit size={16} />
                        </button>
                        <button className="p-1 text-red-600 hover:text-red-800" title="Xóa">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="text-center p-6 text-gray-500">
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