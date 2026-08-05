const dialog = document.querySelector('.comic-dialog');
const dialogImage = dialog.querySelector('img');
const dialogTitle = dialog.querySelector('h2');
const closeButton = dialog.querySelector('.dialog-close');

document.querySelectorAll('.comic-card').forEach((card) => {
  card.addEventListener('click', () => {
    dialogImage.src = `../assets/uxmindset/${card.dataset.comic}`;
    dialogImage.alt = card.querySelector('img').alt;
    dialogTitle.textContent = card.dataset.title;
    dialog.showModal();
  });
});

closeButton.addEventListener('click', () => dialog.close());
dialog.addEventListener('click', (event) => {
  if (event.target === dialog) dialog.close();
});
