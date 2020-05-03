/* extension.js
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

/* exported init */

const St = imports.gi.St;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Clutter = imports.gi.Clutter;
const Gio = imports.gi.Gio;
const Json = imports.gi.Json;
const Soup = imports.gi.Soup;
const Me = imports.misc.extensionUtils.getCurrentExtension();


class Extension {
    constructor() {
        this.apiUrl = "https://api.coindesk.com/v1/bpi/currentprice/BTC.json";
        this.refreshSeconds = 60;
    }

    iconPath(name) {
        return `${Me.path}/${name}`;
    }
    load_json_async(url, fun) {
        log(`Loading: ${url}`)
        let here = this;
        let session = new Soup.SessionAsync();
        let message = Soup.Message.new('GET', url);
        session.queue_message(message, function(session, message) {
            let jp = new Json.Parser();
            jp.load_from_data(message.response_body.data, -1);
            fun.call(here, jp.get_root().get_object());
        });
    }

    enable() {
        function updatePrice(self) {
            //topLabel.set_text("Loading ...");
            self.load_json_async(self.apiUrl, (json) => {
                log("Loaded BTC price");
                let btcUsdPrice = json.get_object_member('bpi').get_object_member('USD').get_double_member('rate_float');
                btcUsdPrice = parseInt(btcUsdPrice);
                topLabel.set_text(`$ ${btcUsdPrice}`);
            });
        }

        const Mainloop = imports.mainloop;
        const GLib = imports.gi.GLib;
        const Main = imports.ui.main;
        let snoozeTimeoutId = 0;

        this.btcPriceButton = new PanelMenu.Button(1, "BTCPriceBtn", false);

        let box = new St.BoxLayout();

        let icon = new St.Icon({
            //icon_name: 'system-search-symbolic',
            style_class: "system-status-icon",
        });
        icon.set_gicon(Gio.icon_new_for_string(this.iconPath("bitcoin.svg")));
        
        box.add(icon);
        
        let topLabel = new St.Label(
            {
                text: 'BTC price ...',
                y_expand: true,
                y_align: Clutter.ActorAlign.CENTER      
            }
        );
        box.add(topLabel);
        //box.add(PopupMenu.arrowIcon(St.Side.BOTTOM));

        this.btcPriceButton.actor.add_child(box);

        Main.panel.addToStatusArea("BtcPriceRole", this.btcPriceButton, 0, "right");
        updatePrice(this);

        snoozeTimeoutId = Mainloop.timeout_add(this.refreshSeconds * 1000, () => {
            updatePrice(this);
            return true;
            //return GLib.SOURCE_REMOVE;
        });
    }

    disable() {
        this.btcPriceButton.destroy();
    }
}

function init() {
    return new Extension();
}
