import * as tut from "../../Tutorial/Core";
import * as tg from "../../TutorialGraph/index";
import { RequiredState } from "../../Tutorial/RequiredState";
import { displayDotaErrorMessage, findRealPlayerID, getPlayerHero } from "../../util";
import { TutorialContext } from "../../TutorialGraph/index";
import { GoalTracker } from "../../Goals";

const sectionName: SectionName = SectionName.Chapter1_ShopUI;
let graph: tg.TutorialStep | undefined = undefined
let waitingForPlayerToPurchaseTango = false;
let playerBoughtTango = false;

const requiredState: RequiredState = {
    requireSlacksGolem: true,
    requireSunsfanGolem: true,
    heroGold: 0,
    heroLevel: 3,
    heroAbilityMinLevels: [1, 1, 1, 0],
};

const onStart = (complete: () => void) => {
    print("Starting", sectionName);
    CustomGameEventManager.Send_ServerToAllClients("section_started", { section: sectionName });

    const playerHero = getPlayerHero();
    if (!playerHero) error("Could not find the player's hero.");

    const goalTracker = new GoalTracker();
    const goalOpenShop = goalTracker.addBoolean("Open the shop.");
    const goalBuyTango = goalTracker.addBoolean("Use the gold provided to purchase a Tango.");

    graph = tg.withGoals(_ => goalTracker.getGoals(),
        tg.seq([
            tg.immediate((context) => {
                goalOpenShop.start();
                playerHero.SetGold(90, true);
                waitingForPlayerToPurchaseTango = true;
            }),
            tg.wait(10),
            tg.immediate(_ => {
                goalOpenShop.complete();
                goalBuyTango.start();
            }),
            tg.completeOnCheck(context => {
                return playerBoughtTango;
            }, 0.2),
            tg.immediate((context) => {
                goalBuyTango.complete()
            })
        ])
    )

    graph.start(GameRules.Addon.context, () => {
        print("Completed", sectionName)
        complete()
    })
}

function onStop() {
    print("Stopping", sectionName);

    if (graph) {
        graph.stop(GameRules.Addon.context);
        graph = undefined;
    }
}

export const sectionShopUI = new tut.FunctionalSection(
    sectionName,
    requiredState,
    onStart,
    onStop,
    orderFilter
);

function orderFilter(event: ExecuteOrderFilterEvent): boolean {
    if (event.issuer_player_id_const !== findRealPlayerID()) return true

    if (event.order_type == UnitOrder.PURCHASE_ITEM) {
        if (waitingForPlayerToPurchaseTango) {
            // Only allows buying tango in this phase
            const boughtTango = event.shop_item_name === "item_tango"
            if (boughtTango) {
                playerBoughtTango = true;
                waitingForPlayerToPurchaseTango = false;
            }
            else {
                displayDotaErrorMessage("Use your gold to buy a Tango.");
                return false;
            }
        }
    }

    return true;
}
