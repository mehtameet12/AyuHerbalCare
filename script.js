/* AyuHerbalCare — interactions */
(function () {
  "use strict";

  /* ---- sticky header ---- */
  var header = document.querySelector(".site-header");
  function onScroll() {
    if (window.scrollY > 40) header.classList.add("scrolled");
    else header.classList.remove("scrolled");
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---- mobile menu ---- */
  var toggle = document.querySelector(".menu-toggle");
  var drawer = document.querySelector(".mobile-menu");
  if (toggle && drawer) {
    toggle.addEventListener("click", function () {
      drawer.classList.toggle("open");
      document.body.style.overflow = drawer.classList.contains("open") ? "hidden" : "";
    });
    drawer.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        drawer.classList.remove("open");
        document.body.style.overflow = "";
      });
    });
  }

  /* ---- scroll reveal ---- */
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) {
        e.target.classList.add("in");
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
  document.querySelectorAll(".reveal").forEach(function (el) { io.observe(el); });

  /* ---- booking form validation ---- */
  var form = document.getElementById("bookingForm");
  if (form) {
    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var ok = true;
      var required = form.querySelectorAll("[data-required]");
      required.forEach(function (input) {
        var field = input.closest(".field");
        var valid = input.value.trim() !== "";
        if (input.type === "email") valid = valid && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(input.value);
        if (!valid) { field.classList.add("err"); ok = false; }
        else field.classList.remove("err");
      });
      if (!ok) return;
      form.style.display = "none";
      var success = document.getElementById("formSuccess");
      if (success) success.classList.add("show");
    });
    form.querySelectorAll("[data-required]").forEach(function (input) {
      input.addEventListener("input", function () {
        input.closest(".field").classList.remove("err");
      });
    });
  }

  /* ---- year ---- */
  var yr = document.getElementById("year");
  if (yr) yr.textContent = new Date().getFullYear();
})();
