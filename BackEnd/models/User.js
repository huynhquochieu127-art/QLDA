const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String },
  role: {
    type: String,
    enum: ["MANAGER", "CASHIER", "BARISTA", "WAITER"],
    default: "CASHIER",
  },
});
