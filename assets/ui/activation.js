export function bindActivation(element, action) {
  element.addEventListener("click", action);
  element.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    action();
  });
}
