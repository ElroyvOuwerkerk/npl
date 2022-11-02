(function(){
    try {
        if (document.querySelector('.menuheader .mobile-menu') !== null
            && document.querySelector('.menuheader .mobile-menu .experiment-mobile-menu-corporate') === null) {
            var mobileMenu = document.querySelector('.menuheader .mobile-menu');
            // CSS style modifications
            var styles = `
                .menuheader {
                    background-color: #f0ede7;
                }
                .menuheader .mainmenu li.first {
                    background-color: #009b00;
                }
                .menuheader .experiment-mobile-menu-corporate {
                    padding: 0 20px !important;
                }
                .menuheader .experiment-mobile-menu-corporate a {
                    display: inline !important;
                    font-size: 15px !important;
                    padding: 5px 30px 5px 10px !important;
                }
                .menuheader .experiment-mobile-menu-corporate a:after { 
                    top: -6px;
                }
                @media only screen and (max-width: 350px) {
                    .menuheader .experiment-mobile-menu-corporate a:after { 
                        display: none;
                    }
                    .menuheader .experiment-mobile-menu-corporate a {
                        padding: 5px 10px 5px 10px !important;
                    }
                }
                @-moz-document url-prefix() {
                    .menuheader .mobile-menu a.item.open:before {
                        top: 0px !important;
                    }
                }
                @media screen and (-webkit-min-device-pixel-ratio:0)
                    and (min-resolution:.001dpcm) {
                        .menuheader .mobile-menu a.item.open:before {
                            top: 0px !important;
                    }
                }
            `
            // Add CSS
            var styleSheet = document.createElement("style")
            styleSheet.innerText = styles
            document.head.appendChild(styleSheet)
            // Add menuitem (button) in mobile menu
            var mobileSpeelMeeButton = document.createElement('li');
            mobileSpeelMeeButton.classList.add('options', 'js--mobile-menu-toggle', 'experiment-mobile-menu-corporate');
            mobileSpeelMeeButton.innerHTML = '<a class="primary button" href="/meespelen" target="_blank">Speel nu mee</a>';
            mobileMenu.prepend(mobileSpeelMeeButton);
            // Remove "Menu" text from mobile menu button
            mobileMenu.querySelector('.item.open').innerText = '';
            // Adjust text of (non-mobile) main menu "Meespelen" item
            document.querySelector('.menuheader .mainmenu li.first a').innerText = 'Speel nu mee';
        }
    } catch(e) {}
})();