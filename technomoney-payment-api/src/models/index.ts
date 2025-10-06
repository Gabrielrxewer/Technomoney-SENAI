import sequelize from "../config/config";
import { Sequelize, DataTypes } from "sequelize";
import PaymentFactory from "./payment.model";

const db: any = {};

db.Payment = PaymentFactory(sequelize, DataTypes);

db.sequelize = sequelize;
db.Sequelize = Sequelize;

export default db;
