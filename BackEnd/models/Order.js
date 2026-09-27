// models/Order.js (hoặc file Schema tương tự)
const orderSchema = new mongoose.Schema(
  {
    // các trường khác: items, totalPrice, tableNumber,...
    status: {
      type: String,
      enum: ["PENDING", "PROCESSING", "COMPLETED", "PAID", "CANCELLED"],
      default: "PENDING",
    },
  },
  { timestamps: true },
);
