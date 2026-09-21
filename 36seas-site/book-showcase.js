(() => {
  const root = document.querySelector('.seas-showcase');
  if (!root) return;
  const books = {
    ocala: { image: '/assets/ocala-nine-cover.jpg', title: 'The Ocala Nine', description: 'The fountain was found. Nine paid the price.', explore: '/books/the-ocala-nine/', buy: 'https://www.amazon.com/dp/B0H18PZSY9', width: 698, height: 1068 },
    meat: { image: '/assets/meat-wagon-cover.jpg', title: 'Meat Wagon', description: 'Humanity got healthier. Then somebody noticed we tasted better.', explore: '/books/meat-wagon/', buy: 'https://www.amazon.com/dp/B0HCWJWTZZ', width: 750, height: 1200 },
  };
  const cover = root.querySelector('.seas-cover');
  root.querySelectorAll('[data-book]').forEach(button => {
    button.addEventListener('click', () => {
      const book = books[button.dataset.book];
      if (!book) return;
      cover.src = book.image;
      cover.alt = `${book.title} cover by Joshua Carlson`;
      cover.width = book.width;
      cover.height = book.height;
      root.querySelector('.seas-book-meta h2').textContent = book.title;
      root.querySelector('.seas-book-meta p').textContent = book.description;
      root.querySelector('[data-showcase-explore]').href = book.explore;
      root.querySelector('[data-showcase-buy]').href = book.buy;
      root.querySelectorAll('[data-book]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    });
  });
})();
