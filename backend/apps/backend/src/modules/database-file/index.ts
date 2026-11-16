import { ModuleProvider, Modules } from "@medusajs/framework/utils"
import DatabaseFileProviderService from "./service"

export default ModuleProvider(Modules.FILE, {
  services: [DatabaseFileProviderService],
})
