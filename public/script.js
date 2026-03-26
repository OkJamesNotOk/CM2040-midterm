//  price calculator
function updateTotal() {
  const form = document.getElementById("bookingForm");
  if (!form) {
    return;
  }

  const p1 = parseFloat(form.dataset.price1);
  const p2 = parseFloat(form.dataset.price2);

  const qty1 = document.getElementById("qty1");
  const qty2 = document.getElementById("qty2");
  const total = document.getElementById("total");

  const t = (Number(qty1.value) || 0) * p1 + (Number(qty2.value) || 0) * p2;
  total.innerHTML = `<strong>Total: $${t.toFixed(2)}</strong>`;
}

// close alert messages when the close button is clicked
function closeAlert() {
  document.querySelectorAll(".alert .close").forEach(function (btn) {
    btn.addEventListener("click", function () {
      const alert = btn.closest(".alert");
      if (alert) alert.remove();
    });
  });
}

// event listeners
document.addEventListener("DOMContentLoaded", function () {
  closeAlert();
  updateTotal();
});
