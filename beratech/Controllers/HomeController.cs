using Microsoft.AspNetCore.Mvc;

namespace beratech.Controllers
{
    public class HomeController : Controller
    {
        public IActionResult Index()
        {
            return View();
        }
    }
}

