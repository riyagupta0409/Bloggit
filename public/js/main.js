const menuBtn = document.querySelector('.menu-btn');
let menuOpen = false;
menuBtn.addEventListener('click', () => {
    if (!menuOpen) {
        menuBtn.classList.add('open');
        menuOpen = true;
    } else {
        menuBtn.classList.remove('open');
        menuOpen = false;
    }
});

const height = document.querySelector('#container1').offsetHeight
console.log(height)
window.onscroll = () => {

    if (document.documentElement.scrollTop > height) {

        document.getElementById('fixed-side').classList.add('bookmark-list')
    } else {
        document.getElementById('fixed-side').classList.remove('bookmark-list')
    }
}

elements = document.querySelectorAll('.to-title');
elements.forEach(function (s) {
    s1 = s.innerText.toLowerCase()
    var str = s1.split(' ');
    for (var i = 0; i < str.length; i++) {
        str[i] = str[i].charAt(0).toUpperCase() + str[i].slice(1);
        s.innerText = str.join(' ');


    }
});

function LengthToMinutes(s) {
    var l = s.length;
    min = Math.round(l / 100);
    return min
}

