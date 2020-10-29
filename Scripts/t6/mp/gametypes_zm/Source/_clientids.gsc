#include maps/mp/_utility;
#include common_scripts/utility;
#include maps/mp/gametypes_zm/_hud_util;
#include maps/mp/zombies/_zm;
#include maps/mp/zombies/_zm_utility;
#include maps/mp/zombies/_zm_weapons;
#include maps/mp/zombies/_zm_stats;
#include maps/mp/gametypes_zm/_hud_message;
#include maps/mp/zombies/_zm_powerups;
#include maps/mp/zombies/_zm_perks;
#include maps/mp/zombies/_zm_audio;
#include maps/mp/zombies/_zm_score;

init()
{
	level thread playerBank(); // Bank plugin
	level thread onPlayerConnect();
	level thread roundLogger();	// Stats plugin
}

onPlayerConnect()
{
	level endon( "end_game" );
    self endon( "disconnect" );
	for (;;)
	{
		level waittill( "connected", player );
		// --- start stats plugin ---
		player thread statsUpdate();
		player thread downLogger();
		player thread reviveLogger();
		// --- end stats plugin ---

		// --- start bank plugin ---
		player thread setPlayerMoney();
		player thread endPlayerMoney();
		player thread endPlayerMoney2();
		// --- end bank plugin ---
	}
}

// --- start bank plugin ---
endPlayerMoney() {
	self endon("disconnect");
	for (;;) {
		level waittill("end_game");
		setDvar(self getEntityNumber() + "_money", 0);
	}
}

endPlayerMoney2() {
	self endon("disconnect");
	for (;;) {
		level waittill("_zombie_game_over");
		setDvar(self getEntityNumber() + "_money", 0);
	}
}

setPlayerMoney() {
	level endon("end_game");
	self endon("disconnect");
	for (;;) {
		if (!isAlive(self)) {
			setDvar(self getEntityNumber() + "_money", 0);
		} else {
			setDvar(self getEntityNumber() + "_money", self.score);
		}
		wait 0.05;
	}
}

getPlayerByGuid(guid) {
	for (i = 0; i < level.players.size; i++) {
		if (isAlive(level.players[i]) && int(level.players[i] getGuid()) == int(guid)) {
			return level.players[i];
		} 
	}
	return false;
}

playerBank() {
	for (;;) {
		if (getDvar("bank_withdraw") != "") {
			withdraw = strTok(getDvar("bank_withdraw"), ";");
			setDvar("bank_withdraw", "");
			getPlayerByGuid(withdraw[0]).score += int(withdraw[1]);
			getPlayerByGuid(withdraw[0]) iPrintLn("Withdrew ^2$" + int(withdraw[1]) + "^7 from your bank account!");
		}
		if (getDvar("bank_deposit") != "") {
			deposit = strTok(getDvar("bank_deposit"), ";");
			setDvar("bank_deposit", "");
			getPlayerByGuid(deposit[0]).score -= int(deposit[1]);
			getPlayerByGuid(deposit[0]) iPrintLn("Deposited ^2$" + int(deposit[1]) + "^7 into your bank account!");
		}
		wait 0.05;
	}
}
// -- end bank plugin --

// -- start stats plugin --
arr2json(arr) {
	if (isObj(arr)) {
		return obj2json(arr);
	}
	keys = getArrayKeys(arr);
	string = "[";
	for (i = 0; i < keys.size; i++) {
		key = keys[i];
		if (!isObj(arr[key])) {
			if (isInt(arr[key])) {
				string += arr[key];
			} else {
				string += "\"" + arr[key] + "\"";
			}
		} else {
			string += obj2json(arr[key]);
		}
		if (i < keys.size - 1) {
			string += ", ";
		}
	}
	string += "]";
	return string;
}

isInt(var) {
	return int(var) == var;
}

json_encode(obj) {
	if (!IsArray(obj)) {
		return "\"" + obj + "\"\n";
	}
	if (!isObj(obj)) {
		return arr2json(obj) + "\n";
	}
	return obj2json(obj) + "\n";
}

obj2json(obj) {
	string = "{";
	keys = getArrayKeys(obj);
	if (!isDefined(keys)) {
		return "{ struct }";
	}
	for (i = 0; i < keys.size; i++) {
		key = keys[i];
		if (IsArray(obj[key])) {
			string += "\"" + key + "\": " + arr2json(obj[key]);
		} else {
			if (!isInt(obj[key])) {
				string += "\"" + key + "\": \"" + obj[key] + "\"";
			} else {
				string += "\"" + key + "\": " + obj[key];
			}
		}
		if (i < keys.size - 1) {
			string += ", ";
		}
	}
	string += "}";
	return string;
}

isObj(obj) {
	keys = getArrayKeys(obj);
	if (!isDefined(keys)) {
		return false;
	}
	for (i = 0; i < keys.size; i++) {
		if (int(keys[i]) == 0 && keys[i] != 0) {
			return true;
		}
	}
	return false;
}

playersToArr() {
	players = [];
	for (i = 0; i < level.players.size; i++) {
		players[i] = [];
		players[i]["Name"] = level.players[i].name;
		players[i]["Guid"] = level.players[i] getGuid();
		players[i]["Clientslot"] = level.players[i] getEntityNumber();
		players[i]["Stats"] = level.players[i] getPlayerStats();

	}
	return players;
}

statsUpdate() {
	self endon("disconnect");
	for (;;) {
		obj = [];
		obj["event"] = "update_stats";
		obj["player"] = [];
		obj["player"]["Guid"] = self.guid;
		obj["player"]["Clientslot"] = self getEntityNumber();
		obj["player"]["Stats"] = self getPlayerStats();
		logPrint(json_encode(obj));
		wait 60;
	}
}

getPlayerStats() {
	stats = [];
	stats["Kills"] = self.pers["kills"];
	stats["Downs"] = self.pers["downs"];
	stats["Revives"] = self.pers["revives"];
	stats["Headshots"] = self.pers["headshots"];
	stats["Score"] = self.score_total;
	return stats;
}

reviveLogger() {
	for (;;) {
		self waittill("player_revived");
		obj = [];
		obj["event"] = "player_revived";
		obj["player"] = [];
		obj["player"]["Name"] = self.name;
		obj["player"]["Guid"] = self.guid;
		obj["player"]["Clientslot"] = self getEntityNumber();
		obj["player"]["Stats"] = self getPlayerStats();
		logPrint(json_encode(obj));
	}
}

downLogger() {
	for (;;) {
		self waittill("player_downed");
		obj = [];
		obj["event"] = "player_downed";
		obj["player"] = [];
		obj["player"]["Name"] = self.name;
		obj["player"]["Guid"] = self.guid;
		obj["player"]["Clientslot"] = self getEntityNumber();
		obj["player"]["Stats"] = self getPlayerStats();
		logPrint(json_encode(obj));
	}
}

roundLogger() {
	for (;;) {
		level waittill( "start_of_round" );
		obj = [];
		obj["event"] = "round_start";
		obj["players"] = playersToArr();
		obj["round"] = level.round_number;
		logPrint(json_encode(obj));
	}
}
// -- end stats plugin --

