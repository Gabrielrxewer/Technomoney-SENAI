import path from "path";
import { Sequelize } from "sequelize";
import { initUserModel, User } from "./user.model";
import { initRefreshTokenModel, RefreshToken } from "./refresh-token.model";
import { initSessionModel, Session } from "./session.model";
import { initCredentialModel, Credential } from "./credential.model";

import cfgAll from "../config/config";
const env = process.env.NODE_ENV || "production";
const config =
  (cfgAll as any)[env] ||
  (cfgAll as any).production ||
  (cfgAll as any).development;

if (!config) {
  throw new Error(`Sequelize config não encontrado para env='${env}'.`);
}

export const sequelize: Sequelize = config.use_env_variable
  ? new Sequelize(process.env[config.use_env_variable] as string, config)
  : new Sequelize(config.database, config.username, config.password, config);

initUserModel(sequelize);
initRefreshTokenModel(sequelize);
initSessionModel(sequelize);
initCredentialModel(sequelize);

User.hasMany(RefreshToken, { foreignKey: "user_id" });
User.hasMany(Session, { foreignKey: "user_id" });
RefreshToken.belongsTo(User, { foreignKey: "user_id" });
Session.belongsTo(User, { foreignKey: "user_id" });
Credential.belongsTo(User, { foreignKey: "user_id" });

export { Sequelize } from "sequelize";
export { User, RefreshToken, Credential, Session };
const models = { sequelize, Sequelize, User, RefreshToken, Credential, Session };
export default models;
