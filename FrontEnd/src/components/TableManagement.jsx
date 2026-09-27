import React, { useState, useEffect } from "react";
import "../../css/tables.css";
import {
  Grid,
  Plus,
  Trash2,
  Edit,
  Settings,
  Coffee,
  Clock,
  Users,
  Layers,
  X,
  CheckCircle,
  AlertCircle,
  Sparkles,
} from "lucide-react";

// Dữ liệu mẫu ban đầu cho Khu vực
const DEFAULT_AREAS = [
  {
    id: "area-1",
    name: "Khu Máy Lạnh",
    description: "Không gian máy lạnh yên tĩnh, mát mẻ",
  },
  {
    id: "area-2",
    name: "Khu Sân Vườn",
    description: "Không gian ngoài trời thoáng mát, nhiều cây xanh",
  },
  {
    id: "area-3",
    name: "Khu Hút Thuốc",
    description: "Khu vực riêng biệt ngoài hiên có gạt tàn",
  },
  {
    id: "area-4",
    name: "Tầng Lửng (VIP)",
    description: "Không gian riêng tư, view nhìn xuống sảnh",
  },
];

// Dữ liệu mẫu ban đầu cho Bàn (Gồm đủ 3 trạng thái: Xanh - Trống, Đỏ - Có khách, Vàng - Đang dọn)
const DEFAULT_TABLES = [
  {
    id: 1,
    name: "Bàn 01",
    areaId: "area-1",
    capacity: 4,
    status: "occupied", // ĐỎ: Đang có khách
    checkInTime: "14:15",
    totalAmount: 85000,
    itemCount: 3,
  },
  {
    id: 2,
    name: "Bàn 02",
    areaId: "area-1",
    capacity: 4,
    status: "empty", // XANH: Bàn trống
  },
  {
    id: 3,
    name: "Bàn 03",
    areaId: "area-1",
    capacity: 2,
    status: "empty", // XANH: Bàn trống
  },
  {
    id: 4,
    name: "Bàn 04",
    areaId: "area-1",
    capacity: 6,
    status: "cleaning", // VÀNG: Đang dọn dẹp
  },
  {
    id: 5,
    name: "Bàn 05",
    areaId: "area-2",
    capacity: 4,
    status: "occupied", // ĐỎ: Đang có khách
    checkInTime: "14:40",
    totalAmount: 58000,
    itemCount: 2,
  },
  {
    id: 6,
    name: "Bàn 06",
    areaId: "area-2",
    capacity: 4,
    status: "empty", // XANH: Bàn trống
  },
  {
    id: 7,
    name: "Bàn 07",
    areaId: "area-2",
    capacity: 2,
    status: "empty", // XANH: Bàn trống
  },
  {
    id: 8,
    name: "Bàn 08",
    areaId: "area-3",
    capacity: 4,
    status: "empty", // XANH: Bàn trống
  },
  {
    id: 9,
    name: "Bàn 09",
    areaId: "area-3",
    capacity: 2,
    status: "cleaning", // VÀNG: Đang dọn dẹp
  },
  {
    id: 10,
    name: "Bàn 10",
    areaId: "area-4",
    capacity: 8,
    status: "occupied", // ĐỎ: Đang có khách
    checkInTime: "13:30",
    totalAmount: 195000,
    itemCount: 6,
  },
];

export default function TableManagement({ currentRole = "admin", onSelectTableForPos }) {
  // 1. Quản lý State Khu vực & Bàn (Có đồng bộ localStorage)
  const [areas, setAreas] = useState(() => {
    const saved = localStorage.getItem("cf_areas");
    return saved ? JSON.parse(saved) : DEFAULT_AREAS;
  });

  const [tables, setTables] = useState(() => {
    const saved = localStorage.getItem("cf_tables");
    return saved ? JSON.parse(saved) : DEFAULT_TABLES;
  });

  // Chế độ xem: 'pos' (Sơ đồ lưới trực quan) | 'admin' (Quản lý thiết lập Khu vực & Bàn)
  const [activeView, setActiveView] = useState("pos");

  // Lọc theo khu vực trong Sơ đồ POS ('all' hoặc areaId)
  const [selectedAreaFilter, setSelectedAreaFilter] = useState("all");

  // Khu vực đang chọn để quản lý bàn trong trang Admin
  const [selectedAdminArea, setSelectedAdminArea] = useState(areas[0]?.id || "area-1");

  // State các Modal
  const [showAreaModal, setShowAreaModal] = useState(false);
  const [editingArea, setEditingArea] = useState(null);
  const [areaForm, setAreaForm] = useState({ name: "", description: "" });

  const [showTableModal, setShowTableModal] = useState(false);
  const [editingTable, setEditingTable] = useState(null);
  const [tableForm, setTableForm] = useState({
    name: "",
    areaId: "",
    capacity: 4,
    status: "empty",
  });

  // Modal tạo hàng loạt bàn (Bulk Create)
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkCount, setBulkCount] = useState(5);
  const [bulkCapacity, setBulkCapacity] = useState(4);

  // Modal chi tiết bàn khi thu ngân click vào bàn trên Grid POS
  const [detailModalTable, setDetailModalTable] = useState(null);

  // Đồng bộ vào localStorage khi dữ liệu thay đổi
  useEffect(() => {
    localStorage.setItem("cf_areas", JSON.stringify(areas));
  }, [areas]);

  useEffect(() => {
    localStorage.setItem("cf_tables", JSON.stringify(tables));
  }, [tables]);

  // Thống kê số lượng bàn
  const totalTablesCount = tables.length;
  const emptyTablesCount = tables.filter((t) => t.status === "empty").length;
  const occupiedTablesCount = tables.filter((t) => t.status === "occupied").length;
  const cleaningTablesCount = tables.filter((t) => t.status === "cleaning").length;

  // Lọc bàn hiển thị theo khu vực trong Sơ đồ POS
  const filteredTables =
    selectedAreaFilter === "all"
      ? tables
      : tables.filter((t) => t.areaId === selectedAreaFilter);

  // Danh sách bàn thuộc khu vực đang chọn trong trang Admin
  const adminAreaTables = tables.filter((t) => t.areaId === selectedAdminArea);

  // ========================================================
  // XỬ LÝ KHU VỰC (AREA CRUD)
  // ========================================================

  const handleOpenAddArea = () => {
    setEditingArea(null);
    setAreaForm({ name: "", description: "" });
    setShowAreaModal(true);
  };

  const handleOpenEditArea = (area) => {
    setEditingArea(area);
    setAreaForm({ name: area.name, description: area.description || "" });
    setShowAreaModal(true);
  };

  const handleSaveArea = (e) => {
    e.preventDefault();
    if (!areaForm.name.trim()) {
      alert("Vui lòng nhập tên khu vực!");
      return;
    }

    if (editingArea) {
      setAreas((prev) =>
        prev.map((a) =>
          a.id === editingArea.id
            ? { ...a, name: areaForm.name, description: areaForm.description }
            : a
        )
      );
    } else {
      const newArea = {
        id: "area-" + Date.now(),
        name: areaForm.name,
        description: areaForm.description,
      };
      setAreas((prev) => [...prev, newArea]);
      setSelectedAdminArea(newArea.id);
    }

    setShowAreaModal(false);
  };

  const handleDeleteArea = (areaId) => {
    const areaToDelete = areas.find((a) => a.id === areaId);
    const tableCount = tables.filter((t) => t.areaId === areaId).length;

    if (
      window.confirm(
        `Bạn có chắc chắn muốn xóa khu vực "${areaToDelete?.name}"?\n(Toàn bộ ${tableCount} bàn trong khu vực này cũng sẽ bị xóa!)`
      )
    ) {
      setAreas((prev) => prev.filter((a) => a.id !== areaId));
      setTables((prev) => prev.filter((t) => t.areaId !== areaId));
      if (selectedAdminArea === areaId) {
        const remaining = areas.filter((a) => a.id !== areaId);
        if (remaining.length > 0) setSelectedAdminArea(remaining[0].id);
      }
    }
  };

  // ========================================================
  // XỬ LÝ BÀN (TABLE CRUD)
  // ========================================================

  const handleOpenAddTable = () => {
    setEditingTable(null);
    const countInArea = tables.filter((t) => t.areaId === selectedAdminArea).length;
    setTableForm({
      name: `Bàn ${String(countInArea + 1).padStart(2, "0")}`,
      areaId: selectedAdminArea,
      capacity: 4,
      status: "empty",
    });
    setShowTableModal(true);
  };

  const handleOpenEditTable = (table) => {
    setEditingTable(table);
    setTableForm({
      name: table.name,
      areaId: table.areaId,
      capacity: table.capacity || 4,
      status: table.status || "empty",
    });
    setShowTableModal(true);
  };

  const handleSaveTable = (e) => {
    e.preventDefault();
    if (!tableForm.name.trim()) {
      alert("Vui lòng nhập tên bàn!");
      return;
    }

    if (editingTable) {
      setTables((prev) =>
        prev.map((t) =>
          t.id === editingTable.id
            ? {
                ...t,
                name: tableForm.name,
                areaId: tableForm.areaId,
                capacity: Number(tableForm.capacity),
                status: tableForm.status,
              }
            : t
        )
      );
    } else {
      const newTable = {
        id: Date.now(),
        name: tableForm.name,
        areaId: tableForm.areaId || selectedAdminArea,
        capacity: Number(tableForm.capacity),
        status: tableForm.status,
      };
      setTables((prev) => [...prev, newTable]);
    }

    setShowTableModal(false);
  };

  // Tạo hàng loạt bàn (Bulk Add Tables)
  const handleBulkCreateTables = (e) => {
    e.preventDefault();
    const count = parseInt(bulkCount, 10);
    if (!count || count <= 0) {
      alert("Vui lòng nhập số lượng bàn hợp lệ!");
      return;
    }

    const currentTotal = tables.length;
    const newBatch = [];

    for (let i = 1; i <= count; i++) {
      const nextNum = currentTotal + i;
      newBatch.push({
        id: Date.now() + i,
        name: `Bàn ${String(nextNum).padStart(2, "0")}`,
        areaId: selectedAdminArea,
        capacity: Number(bulkCapacity),
        status: "empty",
      });
    }

    setTables((prev) => [...prev, newBatch]);
    setShowBulkModal(false);
    alert(`Đã tạo thành công ${count} bàn mới cho khu vực!`);
  };

  const handleDeleteTable = (tableId) => {
    const table = tables.find((t) => t.id === tableId);
    if (window.confirm(`Bạn có chắc chắn muốn xóa "${table?.name}"?`)) {
      setTables((prev) => prev.filter((t) => t.id !== tableId));
    }
  };

  // Thay đổi trạng thái bàn nhanh (empty / occupied / cleaning)
  const handleChangeStatus = (tableId, newStatus) => {
    setTables((prev) =>
      prev.map((t) => {
        if (t.id === tableId) {
          if (newStatus === "occupied") {
            return {
              ...t,
              status: newStatus,
              checkInTime: new Date().toLocaleTimeString("vi-VN", {
                hour: "2-digit",
                minute: "2-digit",
              }),
              totalAmount: t.totalAmount || 0,
              itemCount: t.itemCount || 0,
            };
          } else if (newStatus === "empty") {
            const { checkInTime, totalAmount, itemCount, ...rest } = t;
            return { ...rest, status: newStatus };
          }
          return { ...t, status: newStatus };
        }
        return t;
      })
    );

    if (detailModalTable && detailModalTable.id === tableId) {
      setDetailModalTable((prev) => ({ ...prev, status: newStatus }));
    }
  };

  // Bấm vào bàn để mở POS bán hàng cho bàn đó
  const handleOpenPosForTable = (tableName) => {
    if (onSelectTableForPos) {
      onSelectTableForPos(tableName);
    }
    setDetailModalTable(null);
  };

  return (
    <div className="tables-container">
      {/* 1. HEADER CHUNG & BỘ ĐẾM THỐNG KÊ */}
      <div className="tables-header">
        <div className="tables-header-left">
          <h2>
            <Grid size={24} color="#0066cc" /> Sơ Đồ Bàn & Quản Lý Khu Vực
          </h2>
          <p>
            Theo dõi trạng thái thời gian thực & Cấu hình số lượng bàn cho từng khu vực
          </p>
        </div>

        {/* Thanh đếm trạng thái màu Xanh - Đỏ - Vàng theo đúng yêu cầu */}
        <div className="status-counters">
          <div className="status-badge all">
            <span>Tổng: <strong>{totalTablesCount}</strong> bàn</span>
          </div>
          <div className="status-badge empty" title="Bàn đang trống sẵn sàng đón khách">
            <span className="status-dot empty"></span>
            <span>Trống: <strong>{emptyTablesCount}</strong> (Màu Xanh)</span>
          </div>
          <div className="status-badge occupied" title="Bàn đang có khách ngồi">
            <span className="status-dot occupied"></span>
            <span>Có khách: <strong>{occupiedTablesCount}</strong> (Màu Đỏ)</span>
          </div>
          <div className="status-badge cleaning" title="Bàn đang chờ dọn dẹp">
            <span className="status-dot cleaning"></span>
            <span>Đang dọn: <strong>{cleaningTablesCount}</strong> (Màu Vàng)</span>
          </div>
        </div>

        {/* Chuyển đổi giữa Chế độ POS & Chế độ Quản lý (Admin) */}
        {(currentRole === "admin" || currentRole === "manager") && (
          <div className="view-mode-tabs">
            <button
              className={`mode-tab-btn ${activeView === "pos" ? "active" : ""}`}
              onClick={() => setActiveView("pos")}
            >
              <Grid size={16} /> Sơ đồ bàn (POS)
            </button>
            <button
              className={`mode-tab-btn ${activeView === "admin" ? "active" : ""}`}
              onClick={() => setActiveView("admin")}
            >
              <Settings size={16} /> Quản lý Khu vực & Bàn (Admin)
            </button>
          </div>
        )}
      </div>

      {/* ========================================================
          CHẾ ĐỘ 1: GIAO DIỆN POS (THU NGÂN) - SƠ ĐỒ LƯỚI TRỰC QUAN
          ======================================================== */}
      {activeView === "pos" && (
        <div className="pos-table-view">
          {/* Thanh lọc theo Khu vực */}
          <div className="area-filter-bar">
            <span className="filter-label">Khu vực:</span>
            <button
              className={`area-filter-btn ${selectedAreaFilter === "all" ? "active" : ""}`}
              onClick={() => setSelectedAreaFilter("all")}
            >
              Tất cả ({tables.length})
            </button>
            {areas.map((area) => {
              const countInThisArea = tables.filter((t) => t.areaId === area.id).length;
              return (
                <button
                  key={area.id}
                  className={`area-filter-btn ${selectedAreaFilter === area.id ? "active" : ""}`}
                  onClick={() => setSelectedAreaFilter(area.id)}
                >
                  {area.name} ({countInThisArea})
                </button>
              );
            })}
          </div>

          {/* Lưới các bàn dạng Grid với 3 màu sắc chuẩn */}
          <div className="table-grid">
            {filteredTables.map((table) => {
              const areaName =
                areas.find((a) => a.id === table.areaId)?.name || "Khu chung";

              return (
                <div
                  key={table.id}
                  className={`table-card ${table.status}`}
                  onClick={() => setDetailModalTable(table)}
                >
                  <div className="table-card-top">
                    <h3 className="table-title">
                      <Coffee size={18} />
                      {table.name}
                    </h3>

                    {/* Badge trạng thái chuẩn màu Xanh, Đỏ, Vàng */}
                    <span className={`table-status-pill ${table.status}`}>
                      {table.status === "empty" && "Trống"}
                      {table.status === "occupied" && "Có Khách"}
                      {table.status === "cleaning" && "Đang Dọn"}
                    </span>
                  </div>

                  <div className="table-area-tag">
                    {areaName} • {table.capacity || 4} chỗ
                  </div>

                  {/* Thông tin đơn hàng nếu bàn đang có khách */}
                  {table.status === "occupied" && (
                    <div className="table-order-info">
                      <div className="order-detail-row">
                        <span>Giờ vào:</span>
                        <strong>{table.checkInTime || "--:--"}</strong>
                      </div>
                      <div className="order-detail-row">
                        <span>Tạm tính:</span>
                        <span className="order-detail-amount">
                          {(table.totalAmount || 0).toLocaleString("vi-VN")} đ
                        </span>
                      </div>
                    </div>
                  )}

                  {table.status === "empty" && (
                    <div style={{ fontSize: "12px", color: "#10ac84", margin: "8px 0" }}>
                      ✓ Sẵn sàng nhận khách mới
                    </div>
                  )}

                  {table.status === "cleaning" && (
                    <div style={{ fontSize: "12px", color: "#d35400", margin: "8px 0" }}>
                      🧹 Nhân viên đang dọn dẹp
                    </div>
                  )}

                  <div className="table-card-footer">
                    <span>Nhấn để xem thao tác</span>
                    <span className="quick-action-link">Chi tiết →</span>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredTables.length === 0 && (
            <div className="empty-state">
              <span className="empty-state-icon">☕</span>
              <p>Chưa có bàn nào trong khu vực này. Bạn có thể sang tab Quản lý để thêm bàn.</p>
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          CHẾ ĐỘ 2: GIAO DIỆN QUẢN LÝ (ADMIN) - THIẾT LẬP KHU VỰC & BÀN
          ======================================================== */}
      {activeView === "admin" && (
        <div className="admin-management-view">
          {/* CỘT TRÁI: QUẢN LÝ CÁC "KHU VỰC" (THÊM / SỬA / XÓA) */}
          <div className="admin-panel">
            <div className="admin-panel-header">
              <h3>
                <Layers size={18} /> Danh Sách Khu Vực
              </h3>
              <button className="btn-primary-sm" onClick={handleOpenAddArea}>
                <Plus size={15} /> Thêm KV
              </button>
            </div>

            <div className="area-list">
              {areas.map((area) => {
                const count = tables.filter((t) => t.areaId === area.id).length;
                const isSelected = selectedAdminArea === area.id;

                return (
                  <div
                    key={area.id}
                    className={`area-item ${isSelected ? "selected" : ""}`}
                    onClick={() => setSelectedAdminArea(area.id)}
                  >
                    <div className="area-item-info">
                      <h4>{area.name}</h4>
                      <p>{area.description || "Chưa có mô tả"}</p>
                      <small style={{ color: "#0066cc", fontWeight: 600 }}>
                        {count} bàn trong khu này
                      </small>
                    </div>

                    <div className="area-item-actions">
                      <button
                        className="icon-btn"
                        title="Chỉnh sửa khu vực"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEditArea(area);
                        }}
                      >
                        <Edit size={15} />
                      </button>
                      <button
                        className="icon-btn delete"
                        title="Xóa khu vực"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteArea(area.id);
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* CỘT PHẢI: QUẢN LÝ "SỐ LƯỢNG BÀN" TRONG TỪNG KHU VỰC */}
          <div className="admin-panel">
            <div className="admin-panel-header">
              <div>
                <h3>
                  Bàn thuộc khu vực:{" "}
                  <span style={{ color: "#0066cc" }}>
                    {areas.find((a) => a.id === selectedAdminArea)?.name || "Chưa chọn"}
                  </span>
                </h3>
                <small style={{ color: "#718096" }}>
                  Tạo từng bàn hoặc tự động sinh số lượng bàn nhanh chóng
                </small>
              </div>

              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  className="btn-success-sm"
                  onClick={() => setShowBulkModal(true)}
                  title="Tạo nhanh 5, 10 bàn cùng lúc"
                >
                  <Sparkles size={15} /> Tạo Nhanh Bàn
                </button>
                <button className="btn-primary-sm" onClick={handleOpenAddTable}>
                  <Plus size={15} /> Thêm 1 Bàn
                </button>
              </div>
            </div>

            <div className="tables-table-wrapper">
              <table className="tables-data-table">
                <thead>
                  <tr>
                    <th>Tên bàn</th>
                    <th>Số ghế</th>
                    <th>Trạng thái</th>
                    <th>Khu vực</th>
                    <th style={{ textAlign: "right" }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {adminAreaTables.map((table) => (
                    <tr key={table.id}>
                      <td>
                        <strong>{table.name}</strong>
                      </td>
                      <td>
                        <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          <Users size={14} color="#718093" /> {table.capacity || 4} chỗ
                        </span>
                      </td>
                      <td>
                        <select
                          className="table-status-select"
                          value={table.status}
                          onChange={(e) => handleChangeStatus(table.id, e.target.value)}
                        >
                          <option value="empty">🟢 Bàn trống (Xanh)</option>
                          <option value="occupied">🔴 Có khách (Đỏ)</option>
                          <option value="cleaning">🟡 Đang dọn (Vàng)</option>
                        </select>
                      </td>
                      <td>{areas.find((a) => a.id === table.areaId)?.name}</td>
                      <td style={{ textAlign: "right" }}>
                        <button
                          className="icon-btn"
                          title="Sửa bàn"
                          onClick={() => handleOpenEditTable(table)}
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          className="icon-btn delete"
                          title="Xóa bàn"
                          onClick={() => handleDeleteTable(table.id)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {adminAreaTables.length === 0 && (
                <div className="empty-state">
                  <span className="empty-state-icon">🪑</span>
                  <p>Khu vực này hiện chưa có bàn nào.</p>
                  <button className="btn-primary-sm" onClick={handleOpenAddTable}>
                    + Thêm bàn đầu tiên
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 1: THÊM / SỬA KHU VỰC
          ======================================================== */}
      {showAreaModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>{editingArea ? "Chỉnh Sửa Khu Vực" : "Thêm Khu Vực Mới"}</h3>
            <form onSubmit={handleSaveArea}>
              <div className="form-group">
                <label>Tên khu vực (*)</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Khu máy lạnh, Khu sân vườn, Khu hút thuốc..."
                  value={areaForm.name}
                  onChange={(e) => setAreaForm({ ...areaForm, name: e.target.value })}
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label>Mô tả / Vị trí</label>
                <textarea
                  rows="3"
                  className="customer-input"
                  style={{ height: "auto" }}
                  placeholder="Ghi chú về không gian, đặc điểm khu vực..."
                  value={areaForm.description}
                  onChange={(e) =>
                    setAreaForm({ ...areaForm, description: e.target.value })
                  }
                ></textarea>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setShowAreaModal(false)}
                >
                  Hủy
                </button>
                <button type="submit" className="btn-save">
                  {editingArea ? "Cập Nhật" : "Tạo Mới"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 2: THÊM / SỬA 1 BÀN LẺ
          ======================================================== */}
      {showTableModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>{editingTable ? "Chỉnh Sửa Bàn" : "Thêm Bàn Mới"}</h3>
            <form onSubmit={handleSaveTable}>
              <div className="form-group">
                <label>Tên bàn (*)</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Bàn 01, Bàn VIP 1..."
                  value={tableForm.name}
                  onChange={(e) => setTableForm({ ...tableForm, name: e.target.value })}
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label>Thuộc khu vực (*)</label>
                <select
                  className="customer-input"
                  value={tableForm.areaId || selectedAdminArea}
                  onChange={(e) => setTableForm({ ...tableForm, areaId: e.target.value })}
                >
                  {areas.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Số ghế ngồi</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={tableForm.capacity}
                  onChange={(e) =>
                    setTableForm({ ...tableForm, capacity: e.target.value })
                  }
                />
              </div>

              <div className="form-group">
                <label>Trạng thái ban đầu</label>
                <select
                  className="customer-input"
                  value={tableForm.status}
                  onChange={(e) => setTableForm({ ...tableForm, status: e.target.value })}
                >
                  <option value="empty">🟢 Bàn trống (Xanh)</option>
                  <option value="occupied">🔴 Đang có khách (Đỏ)</option>
                  <option value="cleaning">🟡 Đang dọn dẹp (Vàng)</option>
                </select>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setShowTableModal(false)}
                >
                  Hủy
                </button>
                <button type="submit" className="btn-save">
                  {editingTable ? "Cập Nhật" : "Lưu Bàn"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 3: TẠO NHANH HÀNG LOẠT BÀN (BULK CREATE)
          ======================================================== */}
      {showBulkModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>⚡ Tạo Nhanh Số Lượng Bàn</h3>
            <p style={{ fontSize: "13px", color: "#666", marginBottom: "16px" }}>
              Tự động sinh các bàn (Bàn 01, Bàn 02...) cho khu vực:{" "}
              <strong>{areas.find((a) => a.id === selectedAdminArea)?.name}</strong>
            </p>
            <form onSubmit={handleBulkCreateTables}>
              <div className="form-group">
                <label>Số lượng bàn cần tạo thêm (*)</label>
                <input
                  type="number"
                  required
                  min="1"
                  max="50"
                  value={bulkCount}
                  onChange={(e) => setBulkCount(e.target.value)}
                  autoFocus
                />
                <small style={{ color: "#777", marginTop: "4px" }}>
                  Ví dụ nhập 5: hệ thống sẽ tạo tiếp 5 bàn mới liên tiếp.
                </small>
              </div>

              <div className="form-group">
                <label>Số ghế mặc định mỗi bàn</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={bulkCapacity}
                  onChange={(e) => setBulkCapacity(e.target.value)}
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setShowBulkModal(false)}
                >
                  Hủy
                </button>
                <button type="submit" className="btn-save">
                  Tạo {bulkCount} Bàn Ngay
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 4: CHI TIẾT & ĐỔI TRẠNG THÁI BÀN (KHI CLICK Ở GRID POS)
          ======================================================== */}
      {detailModalTable && (
        <div className="modal-overlay">
          <div className="modal-content modal-table-detail">
            <div className="table-detail-header">
              <h3>
                <Coffee size={22} color="#0066cc" /> {detailModalTable.name}
              </h3>
              <button
                className="modal-close-btn"
                onClick={() => setDetailModalTable(null)}
              >
                ✕
              </button>
            </div>

            <div style={{ fontSize: "13px", color: "#666", marginBottom: "12px" }}>
              Khu vực:{" "}
              <strong>
                {areas.find((a) => a.id === detailModalTable.areaId)?.name || "Chung"}
              </strong>{" "}
              • Số chỗ: <strong>{detailModalTable.capacity || 4} ghế</strong>
            </div>

            {/* Chi tiết đơn nếu bàn đang có khách */}
            {detailModalTable.status === "occupied" && (
              <div
                style={{
                  background: "#fff0f0",
                  padding: "14px",
                  borderRadius: "10px",
                  border: "1px solid #ff7979",
                  marginBottom: "14px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                  <span>Giờ vào bàn:</span>
                  <strong>{detailModalTable.checkInTime || "14:00"}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "15px" }}>
                  <span>Tạm tính hiện tại:</span>
                  <strong style={{ color: "#eb4d4b", fontSize: "16px" }}>
                    {(detailModalTable.totalAmount || 0).toLocaleString("vi-VN")} đ
                  </strong>
                </div>
              </div>
            )}

            <label style={{ fontSize: "13px", fontWeight: 700, color: "#333" }}>
              Chuyển đổi trạng thái bàn nhanh:
            </label>
            <div className="status-switch-group">
              <button
                type="button"
                className={`status-switch-btn empty ${
                  detailModalTable.status === "empty" ? "active" : ""
                }`}
                onClick={() => handleChangeStatus(detailModalTable.id, "empty")}
              >
                🟢 Bàn trống (Xanh)
              </button>
              <button
                type="button"
                className={`status-switch-btn occupied ${
                  detailModalTable.status === "occupied" ? "active" : ""
                }`}
                onClick={() => handleChangeStatus(detailModalTable.id, "occupied")}
              >
                🔴 Có khách (Đỏ)
              </button>
              <button
                type="button"
                className={`status-switch-btn cleaning ${
                  detailModalTable.status === "cleaning" ? "active" : ""
                }`}
                onClick={() => handleChangeStatus(detailModalTable.id, "cleaning")}
              >
                🟡 Đang dọn (Vàng)
              </button>
            </div>

            {/* Nút hành động mở POS bán hàng cho bàn này */}
            <button
              type="button"
              className="btn-open-pos"
              onClick={() => handleOpenPosForTable(detailModalTable.name)}
            >
              {detailModalTable.status === "occupied"
                ? "🛒 Vào Đơn Hàng & Thanh Toán"
                : "➕ Mở Bán / Tạo Đơn Cho Bàn Này"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
