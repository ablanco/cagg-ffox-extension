/*jslint white: true, onevar: true, undef: true, nomen: true, eqeqeq: true, plusplus: true, bitwise: true, regexp: true, newcap: true, immed: true, strict: true */
/*global Components, document, window, getBrowser, XMLHttpRequest, com */
"use strict";

//     Firefox Extension. A notifier for http://www.comicagg.com
//     Copyright (C) <2008>  Alejandro Blanco
//
//     This program is free software: you can redistribute it and/or modify
//     it under the terms of the GNU General Public License as published by
//     the Free Software Foundation, either version 3 of the License, or
//     (at your option) any later version.
//
//     This program is distributed in the hope that it will be useful,
//     but WITHOUT ANY WARRANTY; without even the implied warranty of
//     MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
//     GNU General Public License for more details.
//
//     You should have received a copy of the GNU General Public License
//     along with this program.  If not, see <http://www.gnu.org/licenses/>.

// Namespace
if (window.com === undefined) {
    window.com = {};
}

if (!com.cagg) {
    com.cagg = {};
}

// All global variables are declared here
com.cagg.notifier = {

    // Get the preferences root
    gPrefRoot: Components.classes["@mozilla.org/preferences-service;1"]
    .getService(Components.interfaces.nsIPrefService),

    // Create a variable for the timer process
    gTimer: Components.classes["@mozilla.org/timer;1"].createInstance(Components.interfaces.nsITimer),

    // Create a variable for HTTP requests
    gXMLHttpRequest: null,

    // Create a variable for the list of unread comics
    gUnreadComics: []

};

// Get the preferences branch
com.cagg.notifier.gPref = com.cagg.notifier.gPrefRoot.getBranch("extensions.comic-aggregator-notifier.");

// Functions
com.cagg.notifier.updateSet = function (event) {
    var xmlDoc,
        comics,
        count,
        i,
        item;

    if (com.cagg.notifier.gXMLHttpRequest.readyState !== 4) {
        // Petition not finished yet
        return;
    }

    if (com.cagg.notifier.gXMLHttpRequest.status !== 200) {
        // An error happened
        com.cagg.notifier.setIcon('wrong.png');
        com.cagg.notifier.setLabel('0');
        com.cagg.notifier.gUnreadComics = [];  // Clearing unread comics
        return;
    }

    xmlDoc = com.cagg.notifier.gXMLHttpRequest.responseXML.documentElement;
    comics = com.cagg.notifier.gXMLHttpRequest.responseXML.documentElement.childNodes;
    count = xmlDoc.getAttribute("count");

    if (count > 0) {
        com.cagg.notifier.setIcon('on.png');
    } else {
        com.cagg.notifier.setIcon('off.png');
    }

    com.cagg.notifier.setLabel(count);

    com.cagg.notifier.gUnreadComics = [];

    for (i = 0; i < count; i += 1) {
        item = {};
        item.name = comics[i].getAttribute("name");
        item.count = comics[i].getAttribute("count");
        com.cagg.notifier.gUnreadComics.push(item);
    }
};

com.cagg.notifier.updateGet = function () {
    var userName,
        timer;

    com.cagg.notifier.setIcon('loading.gif');

    // Cancel previously submitted notifier job
    com.cagg.notifier.gTimer.cancel();

    // Load the notifier poll timer
    try {
        timer = com.cagg.notifier.gPref.getIntPref('timer');
    } catch (e1) {
        timer = 15;
    }

    // Re-submit with the appropriate poll timer
    com.cagg.notifier.gTimer.initWithCallback(com.cagg.notifier.updateGet, timer * 60000, Components.interfaces.nsITimer.TYPE_ONE_SHOT);

    // Load the notifier user name
    try {
        userName = com.cagg.notifier.gPref.getCharPref('user');
    } catch (e2) {
        return;
    }

    com.cagg.notifier.gXMLHttpRequest = new XMLHttpRequest();
    com.cagg.notifier.gXMLHttpRequest.onreadystatechange = com.cagg.notifier.updateSet;
    com.cagg.notifier.gXMLHttpRequest.open('GET', 'http://www.comicagg.com/ws/' + userName + '/unread');
    com.cagg.notifier.gXMLHttpRequest.setRequestHeader('User-Agent', 'ComicAggregatorNotifier/Comic Aggregator Notifier for Mozilla/1.0');
    com.cagg.notifier.gXMLHttpRequest.send(null);
};

com.cagg.notifier.caggInit = function () {
    // Initial update of notifier icon
    com.cagg.notifier.gTimer.initWithCallback(com.cagg.notifier.updateGet, 5000, Components.interfaces.nsITimer.TYPE_ONE_SHOT);
};

com.cagg.notifier.processClick = function (event) {
    var windowFeatures,
        tab,
        dev,
        url;

    // Right-click event
    if (event.button === 2) {
        windowFeatures = "chrome,dialog,centerscreen,modal=yes,resizable=no";
        window.openDialog('chrome://comic-aggregator-notifier/content/preferences.xul', 'PrefWindow', windowFeatures);
        com.cagg.notifier.gUnreadComics = []; // Clearing unread comics
        com.cagg.notifier.updateGet(); // Checking for new comics
        return;
    }

    // Central-click event
    if (event.button === 1) {
        com.cagg.notifier.updateGet();
        return;
    }

    // Left-click event (also single click, like Mac)
    if (event.button === 0) {
        try {
            tab = com.cagg.notifier.gPref.getBoolPref('tab');
        } catch (e1) {
            tab = false;
        }
        try {
            dev = com.cagg.notifier.gPref.getBoolPref('dev');
        } catch (e2) {
            dev = false;
        }

        url = "http://www.comicagg.com";
        if (dev) {
            // Beta version of the website
            url = "http://dev.comicagg.com";
        }

        if (tab) {
            // New Tab in Background
            getBrowser().addTab(url);
        } else {
            // New Tab in Foreground
            getBrowser().selectedTab = getBrowser().addTab(url);
        }
    }
};

com.cagg.notifier.preferencesInit = function () {
    var userName = document.getElementById('cagg.user'),
        timer = document.getElementById('cagg.time'),
        tabBackground = document.getElementById('cagg.tab'),
        devSite = document.getElementById('cagg.dev');

    try {
        userName.value = com.cagg.notifier.gPref.getCharPref('user');
    } catch (e1) {
        userName.value = '';
    }

    try {
        tabBackground.checked = com.cagg.notifier.gPref.getBoolPref('tab');
    } catch (e2) {
        tabBackground.checked = false;
    }

    try {
        timer.value = com.cagg.notifier.gPref.getIntPref('timer');
    } catch (e3) {
        timer.value = 15;
    }

    try {
        devSite.checked = com.cagg.notifier.gPref.getBoolPref('dev');
    } catch (e4) {
        devSite.checked = false;
    }
};

com.cagg.notifier.savePreferences = function () {
    var userName = document.getElementById('cagg.user'),
        tabBackground = document.getElementById('cagg.tab'),
        devSite = document.getElementById('cagg.dev'),
        timer = document.getElementById('cagg.time'),
        bOkay = true,
        cPref = '',
        sWork = "0123456789",
        sPref,
        j,
        iPref;

    com.cagg.notifier.gPref.setCharPref('user', userName.value);
    com.cagg.notifier.gPref.setBoolPref('tab', tabBackground.checked);
    com.cagg.notifier.gPref.setBoolPref('dev', devSite.checked);

    sPref = timer.value.replace(/^[0]*/);
    for (j = 0; j < sPref.length; j += 1) {
        if (sWork.indexOf(sPref.charAt(j)) === -1) {
            bOkay = false;
        } else {
            cPref = cPref + sPref.charAt(j);
        }
    }
    if (cPref.length === 0) {
        cPref = '0';
    }
    iPref = parseInt(cPref, 10);
    if (iPref < 15) {
        iPref = 15;
    }
    com.cagg.notifier.gPref.setIntPref('timer', iPref);
};

com.cagg.notifier.tooltipPopulate = function () {
    var userNameTT = document.getElementById('cagg.userTT'),
        rows = document.getElementById('caggnotifier-tooltip-details'),
        row,
        item = document.getElementById('cagg.empty'),
        i;

    try {
        userNameTT.value = com.cagg.notifier.gPref.getCharPref('user');
    } catch (e) {
        return;
    }

    // Deleting the old content
    while (rows.hasChildNodes()) {
        rows.removeChild(rows.lastChild);
    }

    // If there aren't new comics get out
    if (com.cagg.notifier.gUnreadComics.length === 0) {
        item.setAttribute("hidden", false);
        return;
    }

    item.setAttribute("hidden", true);

    // Show the information of each unread comic
    for (i = 0; i < com.cagg.notifier.gUnreadComics.length; i += 1) {
        row = document.createElement("row");
        row.setAttribute("align", "center");

        item = document.createElement("label");
        item.setAttribute("value", com.cagg.notifier.gUnreadComics[i].name);
        row.appendChild(item);

        item = document.createElement("label");
        item.setAttribute("value", com.cagg.notifier.gUnreadComics[i].count);
        item.setAttribute("flex", "1");
        row.appendChild(item);

        rows.appendChild(row);
    }
};

com.cagg.notifier.setIcon = function (icon) {
    var image = document.getElementById('cagg.icon');
    if (image) {
        image.src = "chrome://comic-aggregator-notifier/content/" + icon;
    }
};

com.cagg.notifier.setLabel = function (text) {
    var numb = document.getElementById('cagg.number');
    if (numb) {
        numb.value = text;
    }
};
