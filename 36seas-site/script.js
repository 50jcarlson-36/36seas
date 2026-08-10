const header=document.querySelector('[data-header]');const menu=document.querySelector('.menu-toggle');const nav=document.querySelector('#site-nav');
const closeMenu=()=>{nav?.classList.remove('open');menu?.setAttribute('aria-expanded','false')};
menu?.addEventListener('click',()=>{const isOpen=nav.classList.toggle('open');menu.setAttribute('aria-expanded',String(isOpen))});
nav?.querySelectorAll('a').forEach(link=>link.addEventListener('click',closeMenu));
const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;let ticking=false;window.addEventListener('scroll',()=>{header?.classList.toggle('scrolled',window.scrollY>24);if(!reduceMotion&&!ticking){requestAnimationFrame(()=>{document.documentElement.style.setProperty('--scroll',String(Math.min(window.scrollY/window.innerHeight,1)));ticking=false});ticking=true}},{passive:true});
if('IntersectionObserver' in window&&!reduceMotion){const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('visible');observer.unobserve(entry.target)}}),{threshold:.12});document.querySelectorAll('.reveal').forEach(element=>observer.observe(element))}else{document.querySelectorAll('.reveal').forEach(element=>element.classList.add('visible'))}
const parallax=document.querySelector('[data-parallax]');if(parallax&&!reduceMotion){parallax.addEventListener('pointermove',event=>{const box=parallax.getBoundingClientRect();const x=(event.clientX-box.left)/box.width-.5;const y=(event.clientY-box.top)/box.height-.5;parallax.style.setProperty('--tilt-x',`${x*7}deg`);parallax.style.setProperty('--tilt-y',`${y*-7}deg`)});parallax.addEventListener('pointerleave',()=>{parallax.style.setProperty('--tilt-x','0deg');parallax.style.setProperty('--tilt-y','0deg')})}
document.getElementById('year').textContent=new Date().getFullYear();

const showcaseRotator=document.querySelector('[data-showcase-rotator]');
if(showcaseRotator&&!document.documentElement.classList.contains('show-feature-ended')){
  const slides=[...showcaseRotator.querySelectorAll('[data-feature-slide]')];
  const pickers=[...showcaseRotator.querySelectorAll('[data-feature-picker]')];
  const progress=showcaseRotator.querySelector('.showcase-progress span');
  let activeIndex=0;
  let rotation;
  const restartProgress=()=>{
    if(!progress||reduceMotion)return;
    progress.style.animation='none';
    void progress.offsetWidth;
    progress.style.animation='';
  };
  const showSlide=index=>{
    activeIndex=(index+slides.length)%slides.length;
    slides.forEach((slide,slideIndex)=>{
      const active=slideIndex===activeIndex;
      slide.classList.toggle('is-active',active);
      slide.setAttribute('aria-hidden',String(!active));
      slide.tabIndex=active?0:-1;
    });
    pickers.forEach((picker,pickerIndex)=>{
      const active=pickerIndex===activeIndex;
      picker.classList.toggle('is-active',active);
      picker.setAttribute('aria-pressed',String(active));
    });
    restartProgress();
  };
  const startRotation=()=>{
    if(reduceMotion)return;
    clearInterval(rotation);
    showcaseRotator.classList.remove('is-paused');
    rotation=setInterval(()=>showSlide(activeIndex+1),5800);
  };
  const pauseRotation=()=>{
    clearInterval(rotation);
    showcaseRotator.classList.add('is-paused');
  };
  pickers.forEach((picker,index)=>picker.addEventListener('click',()=>{showSlide(index);startRotation()}));
  showcaseRotator.addEventListener('pointerenter',pauseRotation);
  showcaseRotator.addEventListener('pointerleave',startRotation);
  showcaseRotator.addEventListener('focusin',pauseRotation);
  showcaseRotator.addEventListener('focusout',event=>{if(!showcaseRotator.contains(event.relatedTarget))startRotation()});
  showSlide(0);
  startRotation();
}
