// Temporary: strip the APNs entitlement until Push Notifications is enabled on the App ID in the Apple portal
// (EAS capability sync fails via ASC API). Remove this plugin once push is enabled. Set GEOPOLL_IOS_PUSH=1 to keep it.
const { withEntitlementsPlist } = require("expo/config-plugins");
module.exports = (config) => withEntitlementsPlist(config, (c) => {
  if (process.env.GEOPOLL_IOS_PUSH !== "1") delete c.modResults["aps-environment"];
  return c;
});
