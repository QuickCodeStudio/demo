using System;
using System.Collections.Generic;
using System.Linq;
using QuickCode.Demo.Portal.Models;
using QuickCode.Demo.Portal.Helpers;
using Microsoft.AspNetCore.Mvc;
using System.IO;
using Microsoft.AspNetCore.Authorization;
using QuickCode.Demo.Portal.Helpers.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using System.Threading;
using System.Threading.Tasks;

namespace QuickCode.Demo.Portal.Controllers.IdentityModule
{
    [Permission("IdentityModulePortalPageAccessGrants")]
    public partial class PortalPageAccessGrantsController : BaseController
    {
        [Route("GetGroupPermissions")]
        [HttpGet]
        public async Task<IActionResult> GetGroupPermissions()
        {
            var model = GetModel<GetPortalPageAccessGrantData>();
            var groups = (await pagePermissionGroupClient.PermissionGroupsListAsync())?.Items
                ?.Where(g => !StorefrontPermissionGroups.IsStorefrontPublic(g.Name))
                .ToList();
            model.SelectedGroupName = StorefrontPermissionGroups.FirstNonStorefrontName(groups?.Select(g => g.Name))
                                      ?? groups?.FirstOrDefault()?.Name;
            model.ComboList = await FillPageComboBoxes(model.ComboList);
            StorefrontPermissionGroups.RemoveFromCombo(model.ComboList);
            if (string.IsNullOrWhiteSpace(model.SelectedGroupName)
                || StorefrontPermissionGroups.IsStorefrontPublic(model.SelectedGroupName))
            {
                model.SelectedGroupName = StorefrontPermissionGroups.FirstNonStorefrontName(
                    model.ComboList.GetValueOrDefault("PermissionGroups")?.Keys);
            }

            model.Items = await pagePortalPageDefinitionClient.PortalPageDefinitionsGetPortalPageDefinitionsAsync(model.SelectedGroupName);
            SetModelBinder(ref model);
            return View("PortalPageAccessGrants", model);
        }

        [Route("GetGroupPermissions")]
        [HttpPost]
        public async Task<IActionResult> GetGroupPermissions(GetPortalPageAccessGrantData model)
        {
            ModelBinder(ref model);
            model.ComboList = await FillPageComboBoxes(model.ComboList ?? new Dictionary<string, Dictionary<string, string>>());
            StorefrontPermissionGroups.RemoveFromCombo(model.ComboList);
            if (StorefrontPermissionGroups.IsStorefrontPublic(model.SelectedGroupName)
                || string.IsNullOrWhiteSpace(model.SelectedGroupName)
                || !(model.ComboList.GetValueOrDefault("PermissionGroups")?.ContainsKey(model.SelectedGroupName) ?? false))
            {
                model.SelectedGroupName = StorefrontPermissionGroups.FirstNonStorefrontName(
                    model.ComboList.GetValueOrDefault("PermissionGroups")?.Keys);
            }

            model.Items = await pagePortalPageDefinitionClient.PortalPageDefinitionsGetPortalPageDefinitionsAsync(model.SelectedGroupName);
            SetModelBinder(ref model);
            if (IsAjaxRequest())
                return PartialView("_Content", model);
            return View("PortalPageAccessGrants", model);
        }

        [Route("UpdatePermission")]
        [HttpPost]
        public async Task<JsonResult> UpdatePermission(UpdateGroupAuthorizationRequestData model)
        {
            var result = await pagePortalPageDefinitionClient.PortalPageDefinitionsUpdatePortalPagePermissionAsync(model);
            HttpContextAccessor.HttpContext!.Session.Remove("PortalPageDefinitions");
            HttpContextAccessor.HttpContext!.Session.Remove("PortalPageAccessGrants");
            HttpContextAccessor.HttpContext!.Session.Remove("PortalPagePermissionTypes");
            HttpContextAccessor.HttpContext!.Session.Remove("MenuItems");
            HttpContext.RequestServices
                .GetRequiredService<IPortalPagePermissionManager>()
                .InvalidatePermissionGroup(model.PermissionGroupName);
            return Json(result);
        }

        private bool IsAjaxRequest() =>
            string.Equals(Request.Headers["X-Requested-With"], "XMLHttpRequest", StringComparison.OrdinalIgnoreCase);
    }
}

