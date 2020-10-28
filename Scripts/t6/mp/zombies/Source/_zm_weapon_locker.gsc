#include maps/mp/zombies/_zm_audio;
#include maps/mp/zombies/_zm_unitrigger;
#include maps/mp/zombies/_zm_stats;
#include maps/mp/zombies/_zm_weapons;
#include maps/mp/zombies/_zm_magicbox;
#include maps/mp/zombies/_zm_utility;
#include maps/mp/_utility;
#include common_scripts/utility;

saveLockerWeapon() {
	level endon("eng_game");
	self endon("disconnect");
	for (;;) {
		if (self.changedWeaponData) {
			self.changedWeaponData = false;
				self logWeaponData();
		}
		wait 5;
	}
}

logWeaponData() {
	lockerEvent = [];
	lockerEvent["event"] = "locker_set";
	lockerEvent["player"] = [];
	lockerEvent["player"]["Guid"] = self.guid;
	lockerEvent["weapondata"] = self._weapondata;

	logPrint(json_encode(lockerEvent));
}

main()
{
	if (getDvar("g_gametype") != "zclassic") {
		return;
	}
	if (getDvar("mapname") != "zm_buried" && getDvar("mapname") != "zm_highrise" && getDvar("mapname") != "zm_transit") {
		return;
	}
	if ( !isDefined( level.weapon_locker_map ) )
	{
		level.weapon_locker_map = level.script;
	}
	weapon_lockers = getstructarray( "weapons_locker", "targetname" );
	array_thread( weapon_lockers, ::triggerweaponslockerwatch );
}

wl_has_stored_weapondata()
{
	if (!isDefined(self.gotweapondata)) {
		self wl_get_stored_weapondata();
		self.changedWeaponData = false;
		self thread saveLockerWeapon();
		self.gotweapondata = true;
	}

	return isDefined(self._weapondata);
}

wl_get_stored_weapondata()
{
	if (isDefined(self.gotdvar) || isDefined(self._weapondata)) {
		return self._weapondata;
	}

	dvarValue = getDvar(self getGuid() + "_weapondata");
	self.gotdvar = true;

	if (strTok(dvarValue, ",").size < 11) {
		self._weapondata = undefined;
		return self._weapondata;
	}

	weaponraw = strTok(dvarValue, ",");
	weapondata = [];

	weapondata["alt_stock"] = weaponraw[0];
	weapondata["alt_clip"] = weaponraw[1];
	weapondata["lh_clip"] = weaponraw[2];
	weapondata["overheat"] = weaponraw[3];
	weapondata["heat"] = weaponraw[4];
	weapondata["fuel"] = weaponraw[5];
	weapondata["stock"] = weaponraw[6];
	weapondata["clip"] = weaponraw[7];
	weapondata["alt_name"] = weaponraw[8];
	weapondata["dw_name"] = weaponraw[9];
	weapondata["name"] = weaponraw[10];

	self._weapondata = weapondata;

	return self._weapondata;
}

wl_clear_stored_weapondata()
{
	self._weapondata = undefined;
	self.changedWeaponData = true;
}

wl_set_stored_weapondata( weapondata )
{
	self.changedWeaponData = true;
	self._weapondata = weapondata;
}

triggerweaponslockerwatch()
{
	unitrigger_stub = spawnstruct();
	unitrigger_stub.origin = self.origin;
	if ( isDefined( self.script_angles ) )
	{
		unitrigger_stub.angles = self.script_angles;
	}
	else
	{
		unitrigger_stub.angles = self.angles;
	}
	unitrigger_stub.script_angles = unitrigger_stub.angles;
	if ( isDefined( self.script_length ) )
	{
		unitrigger_stub.script_length = self.script_length;
	}
	else
	{
		unitrigger_stub.script_length = 16;
	}
	if ( isDefined( self.script_width ) )
	{
		unitrigger_stub.script_width = self.script_width;
	}
	else
	{
		unitrigger_stub.script_width = 32;
	}
	if ( isDefined( self.script_height ) )
	{
		unitrigger_stub.script_height = self.script_height;
	}
	else
	{
		unitrigger_stub.script_height = 64;
	}
	unitrigger_stub.origin -= anglesToRight( unitrigger_stub.angles ) * ( unitrigger_stub.script_length / 2 );
	unitrigger_stub.targetname = "weapon_locker";
	unitrigger_stub.cursor_hint = "HINT_NOICON";
	unitrigger_stub.script_unitrigger_type = "unitrigger_box_use";
	unitrigger_stub.clientfieldname = "weapon_locker";
	maps/mp/zombies/_zm_unitrigger::unitrigger_force_per_player_triggers( unitrigger_stub, 1 );
	unitrigger_stub.prompt_and_visibility_func = ::triggerweaponslockerthinkupdateprompt;
	maps/mp/zombies/_zm_unitrigger::register_static_unitrigger( unitrigger_stub, ::triggerweaponslockerthink );
}

is_weapon_included( weapon_name ) //checked matches cerberus output
{
	if ( !isDefined( level.zombie_weapons ) )
	{
		return 0;
	}
	return isDefined( level.zombie_weapons[ weapon_name ] );
}

get_nonalternate_weapon( altweapon ) //checked changed to match cerberus output
{
	if ( is_alt_weapon( altweapon ) )
	{
		alt = weaponaltweaponname( altweapon );
		if ( alt == "none" )
		{
			primaryweapons = self getweaponslistprimaries();
			alt = primaryweapons[ 0 ];
			foreach ( weapon in primaryweapons )
			{
				if ( weaponaltweaponname( weapon ) == altweapon )
				{
					alt = weapon;
					break;
				}
			}
		}
		return alt;
	}
	return altweapon;
}

triggerweaponslockerisvalidweaponpromptupdate( player, weaponname )
{
	retrievingweapon = player wl_has_stored_weapondata();
	if ( !retrievingweapon )
	{
		weaponname = player get_nonalternate_weapon( weaponname );
		if ( !triggerweaponslockerisvalidweapon( weaponname ) )
		{
			self sethintstring( &"ZOMBIE_WEAPON_LOCKER_DENY" );
		}
		else
		{
			self sethintstring( &"ZOMBIE_WEAPON_LOCKER_STORE" );
		}
	}
	else
	{
		weapondata = player wl_get_stored_weapondata();
		if ( isDefined( level.remap_weapon_locker_weapons ) )
		{
			weapondata = remap_weapon( weapondata, level.remap_weapon_locker_weapons );
		}
		weapontogive = weapondata[ "name" ];
		primaries = player getweaponslistprimaries();
		maxweapons = get_player_weapon_limit( player );
		weaponname = player get_nonalternate_weapon( weaponname );
		if ( isDefined( primaries ) || primaries.size >= maxweapons && weapontogive == weaponname )
		{
			if ( !triggerweaponslockerisvalidweapon( weaponname ) )
			{
				self sethintstring( &"ZOMBIE_WEAPON_LOCKER_DENY" );
				return;
			}
		}
		self sethintstring( &"ZOMBIE_WEAPON_LOCKER_GRAB" );
	}
}

triggerweaponslockerthinkupdateprompt( player )
{
	self triggerweaponslockerisvalidweaponpromptupdate( player, player getcurrentweapon() );
	return 1;
}

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

triggerweaponslockerisvalidweapon( weaponname )
{
	weaponname = get_base_weapon_name( weaponname, 1 );
	if ( !is_weapon_included( weaponname ) )
	{
		return 0;
	}
	if ( is_offhand_weapon( weaponname ) || is_limited_weapon( weaponname ) )
	{
		return 0;
	}
	return 1;
}

triggerweaponslockerthink()
{
	self.parent_player thread triggerweaponslockerweaponchangethink( self );
	while ( 1 )
	{
		self waittill( "trigger", player );
		retrievingweapon = player wl_has_stored_weapondata();
		if ( !retrievingweapon )
		{
			curweapon = player getcurrentweapon();
			curweapon = player maps/mp/zombies/_zm_weapons::switch_from_alt_weapon( curweapon );
			while ( !triggerweaponslockerisvalidweapon( curweapon ) )
			{
				continue;
			}
			weapondata = player maps/mp/zombies/_zm_weapons::get_player_weapondata( player );
			player wl_set_stored_weapondata( weapondata );

			player takeweapon( curweapon );
			primaries = player getweaponslistprimaries();
			if ( isDefined( primaries[ 0 ] ) )
			{
				player switchtoweapon( primaries[ 0 ] );
			}
			else
			{
				player maps/mp/zombies/_zm_weapons::give_fallback_weapon();
			}
			self triggerweaponslockerisvalidweaponpromptupdate( player, player getcurrentweapon() );
			player playsoundtoplayer( "evt_fridge_locker_close", player );
			player thread maps/mp/zombies/_zm_audio::create_and_play_dialog( "general", "weapon_storage" );
		}
		else
		{
			curweapon = player getcurrentweapon();
			primaries = player getweaponslistprimaries();
			weapondata = player wl_get_stored_weapondata();
			if ( isDefined( level.remap_weapon_locker_weapons ) )
			{
				weapondata = remap_weapon( weapondata, level.remap_weapon_locker_weapons );
			}
			weapontogive = weapondata[ "name" ];
			while ( !triggerweaponslockerisvalidweapon( weapontogive ) )
			{
				player playlocalsound( level.zmb_laugh_alias );
				player wl_clear_stored_weapondata();
				self triggerweaponslockerisvalidweaponpromptupdate( player, player getcurrentweapon() );
			}
			curweap_base = maps/mp/zombies/_zm_weapons::get_base_weapon_name( curweapon, 1 );
			weap_base = maps/mp/zombies/_zm_weapons::get_base_weapon_name( weapontogive, 1 );
			while ( player has_weapon_or_upgrade( weap_base ) && weap_base != curweap_base )
			{
				self sethintstring( &"ZOMBIE_WEAPON_LOCKER_DENY" );
				wait 3;
				self triggerweaponslockerisvalidweaponpromptupdate( player, player getcurrentweapon() );
			}
			maxweapons = get_player_weapon_limit( player );
			if (isDefined(primaries) && primaries.size >= maxweapons)
			{
				curweapon = player maps/mp/zombies/_zm_weapons::switch_from_alt_weapon( curweapon );
				while ( !triggerweaponslockerisvalidweapon( curweapon ) )
				{
					self sethintstring( &"ZOMBIE_WEAPON_LOCKER_DENY" );
					wait 3;
					self triggerweaponslockerisvalidweaponpromptupdate( player, player getcurrentweapon() );
				}
				curweapondata = player maps/mp/zombies/_zm_weapons::get_player_weapondata( player );
				player takeweapon( curweapondata[ "name" ] );
				player maps/mp/zombies/_zm_weapons::weapondata_give( weapondata );
				player wl_set_stored_weapondata( curweapondata );
				player switchtoweapon( weapondata[ "name" ] );
				self triggerweaponslockerisvalidweaponpromptupdate( player, player getcurrentweapon() );
			}
			else
			{
				player thread maps/mp/zombies/_zm_audio::create_and_play_dialog( "general", "wall_withdrawl" );
				player wl_clear_stored_weapondata();
				player maps/mp/zombies/_zm_weapons::weapondata_give( weapondata );
				player switchtoweapon( weapondata[ "name" ] );
				self triggerweaponslockerisvalidweaponpromptupdate( player, player getcurrentweapon() );
			}
			level notify( "weapon_locker_grab" );
			player playsoundtoplayer( "evt_fridge_locker_open", player );
		}
		wait 0.5;
	}
}

triggerweaponslockerweaponchangethink( trigger )
{
	self endon( "disconnect" );
	self endon( "death" );
	trigger endon( "kill_trigger" );
	while ( 1 )
	{
		self waittill( "weapon_change", newweapon );
		trigger triggerweaponslockerisvalidweaponpromptupdate( self, newweapon );
	}
}

add_weapon_locker_mapping( fromweapon, toweapon )
{
	if ( !isDefined( level.remap_weapon_locker_weapons ) )
	{
		level.remap_weapon_locker_weapons = [];
	}
	level.remap_weapon_locker_weapons[ fromweapon ] = toweapon;
}

remap_weapon( weapondata, maptable )
{
	name = get_base_name( weapondata[ "name" ] );
	att = get_attachment_name( weapondata[ "name" ] );
	if ( isDefined( maptable[ name ] ) )
	{
		weapondata[ "name" ] = maptable[ name ];
		name = weapondata[ "name" ];
		if ( is_weapon_upgraded( name ) )
		{
			if ( isDefined( att ) && weapon_supports_attachments( name ) )
			{
				base = get_base_weapon_name( name, 1 );
				if ( !weapon_supports_this_attachment( base, att ) )
				{
					att = random_attachment( base );
				}
				weapondata[ "name" ] = weapondata[ "name" ] + "+" + att;
			}
			else
			{
				if ( weapon_supports_default_attachment( name ) )
				{
					att = default_attachment( name );
					weapondata[ "name" ] = weapondata[ "name" ] + "+" + att;
				}
			}
		}
	}
	else
	{
		return weapondata;
	}
	name = weapondata[ "name" ];
	dw_name = weapondualwieldweaponname( name );
	alt_name = weaponaltweaponname( name );
	if ( name != "none" )
	{
		weapondata[ "clip" ] = int( min( weapondata[ "clip" ], weaponclipsize( name ) ) );
		weapondata[ "stock" ] = int( min( weapondata[ "stock" ], weaponmaxammo( name ) ) );
	}
	if ( dw_name != "none" )
	{
		weapondata[ "lh_clip" ] = int( min( weapondata[ "lh_clip" ], weaponclipsize( dw_name ) ) );
	}
	if ( alt_name != "none" )
	{
		weapondata[ "alt_clip" ] = int( min( weapondata[ "alt_clip" ], weaponclipsize( alt_name ) ) );
		weapondata[ "alt_stock" ] = int( min( weapondata[ "alt_stock" ], weaponmaxammo( alt_name ) ) );
	}
	weapondata[ "dw_name" ] = dw_name;
	weapondata[ "alt_name" ] = alt_name;
	return weapondata;
}
