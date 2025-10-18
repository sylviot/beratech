using Microsoft.AspNetCore.Mvc;

namespace beratech.Controllers
{
    public class PortalController : Controller
    {
        public IActionResult Index()
        {
            return View();
        }
    }
}
