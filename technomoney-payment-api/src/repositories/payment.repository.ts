import sequelize from "../config/config";
import { DataTypes } from "sequelize";

const PaymentFactory = require("../models/payment.model");
const Payment = PaymentFactory(sequelize, DataTypes);

export default {
  create(data: {
    fullName: string;
    cpf: string;
    email: string;
    preferenceId: string;
    status: string;
  }) {
    return Payment.create(data);
  },

  updateStatus(preferenceId: string, status: string) {
    return Payment.update({ status }, { where: { preferenceId } });
  },
};
