document.addEventListener('DOMContentLoaded', () => {

  // Animate bars with delay
  document.querySelectorAll('.platform-bar').forEach((bar, i) => {
    const target = bar.dataset.width || bar.style.width;
    bar.style.width = '0%';
    setTimeout(() => { bar.style.width = target; }, 300 + i * 100);
  });

  document.querySelectorAll('.goal-progress').forEach((bar, i) => {
    const target = bar.dataset.width || bar.style.width;
    bar.style.width = '0%';
    setTimeout(() => { bar.style.width = target; }, 500 + i * 150);
  });

  // Animate chart bars
  document.querySelectorAll('.chart-bar').forEach((bar, i) => {
    const target = bar.style.height;
    bar.style.height = '0';
    setTimeout(() => { bar.style.height = target; }, 400 + i * 80);
  });

  // Smooth scroll
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', e => {
      const target = document.querySelector(link.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  // Page transition on links
  document.querySelectorAll('a[href]').forEach(link => {
    const href = link.getAttribute('href');
    if (href && href.endsWith('.html') && !href.startsWith('http')) {
      link.addEventListener('click', e => {
        e.preventDefault();
        document.body.style.transition = 'opacity 0.3s ease';
        document.body.style.opacity = '0';
        setTimeout(() => { window.location.href = href; }, 300);
      });
    }
  });

  // Sidebar active link
  document.querySelectorAll('.sidebar-link').forEach(link => {
    link.addEventListener('click', () => {
      document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
      link.classList.add('active');
    });
  });

  // Staggered card animations
  document.querySelectorAll('.kpi-card, .feature-card').forEach((el, i) => {
    el.style.animationDelay = `${i * 0.08}s`;
  });

});
