<?php
session_start();
header('Content-Type: text/xml');
ini_set('display_errors', 'On');
include 'hiddenInfo.php';

/*FUNCTION: adminResult- Returns to JS the results of an insertion or 
deletion on one of the tables
Input- mysqli prepared statement, XML object*/
function adminResult ($stmt, $dxml) {
	
	//ERROR HANDLING 
	// Duplicate entry in database - violating UNIQUE constraint 
	if(substr($stmt->error, 0, 9) === 'Duplicate') { 
		$dxml->addChild("response_text", "Entry already exists"); 
	} 			
	
	// Entry not found to delete
	else if ($stmt->affected_rows == 0 && $stmt->error == '' && $_GET['action'] == 'delete') {
		$dxml->addChild("response_text", "No such entry found to delete"); 
	}
	
	else if (strpos($stmt->error, "foreign key") !== FALSE) {
		$dxml->addChild("response_text", "Deleting that entry would destroy other entries!"); 
	}
	
	// No errors 
	else if ($stmt->error == '') {
		$dxml->addChild("response_text", "Successful operation");
	}
}

/*FUNCTION: selectResult - prepares the results of a single selection query 
returning a single column 
Input- mysqli prepared statement, XML object
*/
function selectResult ($stmt, $dxml) {
	
	$options = $stmt->get_result();
	$new_option = "new_option"; 
	
	foreach ($options as $val) {			
		$dxml->addChild($new_option, $val['name']);
	}
}

/*FUNCTION: selectResultArr - prepares the results of a query returning
an array of columns 
Input- mysqli prepared statement, XML object*/
function selectResultArr ($stmt, $dxml) {
	
	$options = $stmt->get_result();
	$new_column = "column";
	$new_row = "row";
	$end_row = "end_row"; 
	
	while ($entry = $options->fetch_array(MYSQLI_NUM)) {
		
		/*Hide and store the flight ID for more efficiently referring to this flight in other
		calls to the database*/
		$dxml->addChild($new_row, $entry[0]);		
			
		for($i = 1; $i < count($entry); $i++) {
			$dxml->addChild($new_column, $entry[$i]);		
		}
		
		$dxml->addChild($end_row, "");		
	}	
}
		
//Connects to database 
$mysql = new mysqli("oniddb.cws.oregonstate.edu", "jaksas-db", $password, "jaksas-db");
if ($mysql->connect_errno) {
	$dxml->addChild("connect_error", "Failed to connect to MySQL: (".$mysql->connect_errno.")".$mysql->connect_error);
}

//Response to Javascript
$dxml = new SimpleXMLElement('<xml/>');

//Block 0: Validate login info
if (isset ($_POST['type'])) {
	
	if ($_POST['type'] == 'new') {
		$q_def = "INSERT INTO user (user_name, password) VALUES (?, ?)";
	}
	
	else {
		$q_def = "SELECT * FROM user WHERE user_name = ? AND password = ?";
	}
	
	$stmt = $mysql->prepare($q_def);
	$stmt->bind_param("ss",$_POST['user'],$_POST['password']);
	$stmt->execute();

	if(substr($stmt->error, 0, 9) === 'Duplicate') { 
		$dxml->addChild("response_text", "That user already exists!"); 
	} 	

	else if($stmt->error != '') {
		$dxml->addChild("response_text", "There was an error during account creation 
			or login: ".$stmt->error); 
	}
	
	else if ($_POST['type'] == 'new') {
		$dxml->addChild("response_text", "success"); 
		$_SESSION['admit'] = 'true';
		$_SESSION['user_name'] = $_POST['user'];	
	}
	
	else {
		$result = $stmt->get_result();
		if ($result->num_rows === 0) {
			$dxml->addChild("response_text", "That combination of user name and password 
			does not exist"); 
		}
		else {
			$dxml->addChild("response_text", "success"); 
			$_SESSION['admit'] = 'true'; 
			$_SESSION['user_name'] = $_POST['user'];	
		}
	}
	
	print($dxml->asXML());	
	
	$q_def = "SELECT user_id FROM user WHERE user_name = ?";
	$stmt = $mysql->prepare($q_def);
	$stmt->bind_param("s",$_POST['user']);
	$stmt->execute();
	$result = $stmt->get_result();	
	$entries = $result->fetch_array(MYSQLI_NUM);
	$_SESSION['user_id'] = $entries[0]; 
	$stmt->close();	
}

//Block 1a: Validate existing session
if (isset ($_GET['session_q'])) {
	if (!isset($_SESSION['admit'])) {
		$dxml->addChild("response_text", "false");
	}
	else if (isset($_SESSION['admit']) && $_SESSION['admit'] == 'true'){
		$dxml->addChild("response_text", "true");
	}
	print($dxml->asXML());		
}

//Block 1b: End session 
if (isset ($_GET['session_end'])) {
	$_SESSION = []; 
	session_destroy();	
}

//Block 1c: Handles linking users to flights
else if(isset($_GET['action_type']) && $_GET['action_type'] == 'flight' && $_GET['action'] == 'bind') {
		
	$q_def = "INSERT INTO user_flight (uid, fid) VALUES ((SELECT user_id FROM user
		WHERE user.user_Name = ?), ?)"; 
	$stmt = $mysql->prepare($q_def);
	$stmt->bind_param("sd", $_SESSION['user_name'],  $_GET['flight_number']);
	$stmt->execute();
	$stmt->close();		
}

//Block 1d: Handles delinking users from flights
else if(isset($_GET['action_type']) && $_GET['action_type'] == 'flight' && $_GET['action'] == 'unbind') {
	
	$q_def = "DELETE FROM user_flight WHERE user_flight.fid = ? AND (
		SELECT user.user_id FROM user WHERE user.user_name = ?)";
	$stmt = $mysql->prepare($q_def);
	$stmt->bind_param("ds", $_GET['flight_number'], $_SESSION['user_name']);
	$stmt->execute();
	$stmt->close();		
}


//Block 2: Handles deletions, additions, and selections from tables without FK references
if(isset($_GET['action_type']) && $_GET['action_type'] == 'simple') {

	$q_def;
	
	// Determine action to perform on table 
	if ($_GET['action'] == 'add') {
		$q_def = "INSERT INTO ";
	}
	
	else if ($_GET['action'] == 'delete') {
		$q_def = "DELETE FROM ";
	}
	
	else if ($_GET['action'] == 'select' && $_GET['table'] != 'crew') {
		$q_def = "SELECT * FROM ";
	}
	
	else if ($_GET['action'] == 'select' && $_GET['table'] == 'crew') {
		$q_def = "SELECT crew_id, name FROM ";
	}
	
	// Determine the table to modify 
	$q_def .= $_GET['table'];
	
	//Finish the query string 
	if ($_GET['action'] == 'add') {
		$q_def .= " (name) VALUES (?)";
	}	
	
	else if ($_GET['action'] == 'delete') {
		$q_def .= " WHERE name=?";
	}
	
	else if ($_GET['action'] == 'select') {
		$q_def .= " ORDER BY name";
	}
		
	$stmt = $mysql->prepare($q_def); 	
	
	// Get name variable, if any 
	if(isset($_GET['text_var'])) {
		$_name = $_GET['text_var'];	
		$stmt->bind_param("s",$_name);
	}
			
	$stmt->execute();
	
	//Report results for admin (add or delete on table) ...
	if ($_GET['action'] != 'select') {
		adminResult($stmt, $dxml); 
	}
	//... or for select
	else if ($_GET['table'] != 'crew'){
		selectResult($stmt, $dxml); 
	}
	
	// ... we return two pieces of information for crew members, name and ID
	else {
		selectResultArr($stmt, $dxml); 
	}
	
	print($dxml->asXML());	
	$stmt->close();	
}

//Block 3: Handles deletions and additions from tables with FK references
else if(isset($_GET['action_type']) && $_GET['action_type'] == 'fk' && $_GET['action'] != 'select') {
		
	//Determine action to perform on table 
	if ($_GET['action'] == 'add') {
		
		$q_def = "INSERT INTO ";
		$q_def .= $_GET['table'];
		$q_def .= " (name, ";
		$q_def .= $_GET['fk'];
		$q_def .= ") VALUES (?, (SELECT ";	
		$q_def .= $_GET['ref'];
		$q_def .= "_id FROM ";
		$q_def .= $_GET['ref'];
		$q_def .= " WHERE name =?))";
	}
	
	else if ($_GET['action'] == 'delete') {
			
		$q_def = "DELETE FROM ";
		$q_def .= $_GET['table'];
		$q_def .= " WHERE "; 
		$q_def .= $_GET['table'];
		$q_def .= ".name = ?";
		$q_def .= " AND EXISTS (SELECT ";
		$q_def .= $_GET['ref'];
		$q_def .= ".name FROM ";
		$q_def .= $_GET['ref'];
		$q_def .= " WHERE ";
		$q_def .= $_GET['ref'];
		$q_def .= ".";
		$q_def .= $_GET['ref'];
		$q_def .= "_id = ";
		$q_def .= $_GET['table'];
		$q_def .= ".";
		$q_def .= $_GET['fk'];
		$q_def .= " AND ";
		$q_def .= $_GET['ref'];
		$q_def .= ".name = ?)";
	}
	
	$stmt = $mysql->prepare($q_def); 				
	$stmt->bind_param("ss",$_GET['text_var'], $_GET['refVal']);
	$stmt->execute();
		
	//Error handling and results 
	adminResult($stmt, $dxml); 
		
	print($dxml->asXML());

	$stmt->close();	
}

//Block 4: Handles selections from tables by foreign key reference
else if(isset($_GET['action_type']) && $_GET['action_type'] == 'fk' && $_GET['action'] == 'select') {
		
	//Build query
	$q_def = "SELECT ";
	$q_def .= $_GET['table'];
	$q_def .= ".name FROM ";
	$q_def .= $_GET['table'];
	$q_def .= ", ";
	$q_def .= $_GET['ref'];
	$q_def .= " WHERE ";
	$q_def .= $_GET['table'];
	$q_def .= ".";
	$q_def .= $_GET['fk'];
	$q_def .= " = ";
	$q_def .= $_GET['ref'];
	$q_def .= ".";
	$q_def .= $_GET['ref'];
	$q_def .= "_id AND ";
	$q_def .= $_GET['ref'];
	$q_def .= ".name = ?";

	//Prepare and execute query 
	$stmt = $mysql->prepare($q_def); 				
	$stmt->bind_param("s",$_GET['refVal']);
	$stmt->execute();
	
	//Put results in XML format and send 
	selectResult($stmt, $dxml); 
	print($dxml->asXML());
	$stmt->close();	
}

//Block 5: Handles additions to the flight table 
else if(isset($_GET['action_type']) && $_GET['action_type'] == 'flight' && $_GET['action'] == 'add_flight') {
	
	//Build query
	$q_def = "INSERT INTO flight (departure_time, arrival_time, source, destination, capacity, booked) ";
	$q_def .= "VALUES (?, ?, (SELECT airport.airport_id FROM airport WHERE name = ?) , ";
	$q_def .= "(SELECT airport.airport_id FROM airport WHERE name = ?), ?, ?)";
	
	//Prepare and execute query 
	$stmt = $mysql->prepare($q_def); 				
	$stmt->bind_param("ssssdd",$_GET['depart'],$_GET['arrive'],$_GET['source'],$_GET['destination'],
		$_GET['capacity'], $_GET['booked']);
	$stmt->execute();
	
	//Error handling and results 
	adminResult($stmt, $dxml); 	
	print($dxml->asXML());	
	$stmt->close();	
}

//Block 6: Handles flight bookings 
else if(isset($_GET['action_type']) && $_GET['action_type'] == 'flight' && $_GET['action'] == 'book') {
	
	$q_def = "UPDATE flight SET booked = booked + 1 WHERE flight.flight_id = ?"; 
	$stmt = $mysql->prepare($q_def);
	$stmt->bind_param("d", $_GET['flight_number']);
	$stmt->execute();
	$stmt->close();		
}

//Block 6a: Handles flight cancellations
else if(isset($_GET['action_type']) && $_GET['action_type'] == 'flight' && $_GET['action'] == 'cancel') {
	
	$q_def = "UPDATE flight SET booked = booked - 1 WHERE flight.flight_id = ?"; 
	$stmt = $mysql->prepare($q_def);
	$stmt->bind_param("d", $_GET['flight_number']);
	$stmt->execute();
	$stmt->close();		
}

//Block 7: Handles flight deletions
else if(isset($_GET['action_type']) && $_GET['action_type'] == 'flight' && $_GET['action'] == 'delete') {
	
	$q_def = "DELETE FROM flight WHERE flight.flight_id = ?"; 
	$stmt = $mysql->prepare($q_def);
	$stmt->bind_param("d", $_GET['flight_number']);
	$stmt->execute();
	$stmt->close();		
}

//Block 8: Handles crew member additions to flights
else if(isset($_GET['action_type']) && $_GET['action_type'] == 'flight' && $_GET['action'] == 'staff') {
	
	$q_def = "INSERT INTO crew_flight (cid, fid) VALUES (?, ?)"; 
	$stmt = $mysql->prepare($q_def);
	$stmt->bind_param("dd", $_GET['crew_number'],  $_GET['flight_number']);
	$stmt->execute();
	$stmt->close();		
}

//Block 9: Handles crew member deletions from flights
else if(isset($_GET['action_type']) && $_GET['action_type'] == 'flight' && $_GET['action'] == 'destaff') {
	
	$q_def = "DELETE FROM crew_flight WHERE crew_flight.cid = ? AND crew_flight.fid = ?"; 
	$stmt = $mysql->prepare($q_def);
	$stmt->bind_param("dd", $_GET['crew_number'],  $_GET['flight_number']);
	$stmt->execute();
	$stmt->close();		
}

//Block : Handles searches for flights with crew members included or not included 
else if(isset($_GET['action_type']) && $_GET['action_type'] == 'flight' && $_GET['action'] == 'getstaff') {
					
	if ($_GET['searchtype'] == 'noton') {
		$q_def =  
	"SELECT flight.flight_id, country.name, city.name, airport.name, flight.departure_time, 
	A.country_name, A.city_name, A.airport_name, A.arrival_time, 
	flight.capacity, flight.booked
	FROM airport, city, country, flight 
	INNER JOIN ( 
		SELECT flight.flight_id, 
		airport.name AS airport_name, 
		city.name AS city_name, 
		country.name AS country_name, 
		flight.arrival_time 
		FROM airport, city, country, flight 
		WHERE flight.destination = airport.airport_id 
		AND airport.cid = city.city_id 
		AND city.cid = country.country_id) A 
	ON flight.flight_id = A.flight_id 
	WHERE flight.source = airport.airport_id 
	AND airport.cid = city.city_id 
	AND city.cid = country.country_id 
	AND (NOT EXISTS (SELECT * FROM crew_flight WHERE flight.flight_id = crew_flight.fid) 
	OR NOT EXISTS (SELECT * FROM crew_flight WHERE flight.flight_id = crew_flight.fid 
	AND crew_flight.cid = ?)) 
	ORDER BY country.name, city.name, airport.name, flight.departure_time, 
	A.city_name, A.airport_name, A.arrival_time, flight.capacity, flight.booked";}
			
	else {
	$q_def =
	"SELECT flight.flight_id, country.name, city.name, airport.name, flight.departure_time,
	A.country_name, A.city_name, A.airport_name, A.arrival_time, flight.capacity, flight.booked
	FROM airport, city, country, flight
	INNER JOIN (
		SELECT flight.flight_id, 
		airport.name AS airport_name, 
		city.name AS city_name, 
		country.name AS country_name,
		crew_flight.fid AS c_fid,
		crew_flight.cid AS c_cid,  
		flight.arrival_time 
		FROM airport, city, country, flight, crew_flight 
		WHERE flight.destination = airport.airport_id
		AND airport.cid = city.city_id
		AND city.cid = country.country_id) A
	ON flight.flight_id = A.flight_id
	WHERE  flight.source = airport.airport_id AND airport.cid = city.city_id 
	AND city.cid = country.country_id AND A.c_fid = flight.flight_id
	AND A.c_cid = ?
	ORDER BY country.name, city.name, airport.name, flight.departure_time, 
	A.city_name, A.airport_name, A.arrival_time, flight.capacity, flight.booked";}
				
	$stmt = $mysql->prepare($q_def);
	$stmt->bind_param("d", $_GET['crew_number']);
	$stmt->execute();
	selectResultArr($stmt, $dxml); 	
	print($dxml->asXML());	
	$stmt->close();		
}

//Block 11: Handles searches on the flight table  
else if(isset($_GET['action_type']) && $_GET['action_type'] == 'flight' && $_GET['action'] == 'select') {
			
	$param_arr = array(); 
	
	if ($_GET['searchtype'] == 'noton') {
		$q_def =  
			"SELECT flight.flight_id, country.name, city.name, airport.name, flight.departure_time, 
			A.country_name, A.city_name, A.airport_name, A.arrival_time, 
			flight.capacity, flight.booked
			FROM airport, city, country, flight 
			INNER JOIN ( 
				SELECT flight.flight_id, 
				airport.name AS airport_name, 
				city.name AS city_name, 
				country.name AS country_name, 
				flight.arrival_time 
				FROM airport, city, country, flight 
				WHERE flight.destination = airport.airport_id 
				AND airport.cid = city.city_id 
				AND city.cid = country.country_id";
	}
	
	else {
		$q_def =
		"SELECT flight.flight_id, country.name, city.name, airport.name, flight.departure_time,
		A.country_name, A.city_name, A.airport_name, A.arrival_time, flight.capacity, flight.booked
		FROM airport, city, country, flight
		INNER JOIN (
			SELECT flight.flight_id, 
			airport.name AS airport_name, 
			city.name AS city_name, 
			country.name AS country_name,
			user_flight.fid AS c_fid,
			user_flight.uid AS c_uid,  
			flight.arrival_time 
			FROM airport, city, country, flight, user_flight 
			WHERE flight.destination = airport.airport_id
			AND airport.cid = city.city_id
			AND city.cid = country.country_id";
	}
			
	if ($_GET['country_arrive'] != 'NONE') {
		$q_def .= "AND country.name = ? ";
	}
	
	if ($_GET['city_arrive'] != 'NONE') {
		$q_def .= "AND city.name = ? ";
		array_push($param_arr, $_GET['city_arrive']);
	}
	
	if ($_GET['airport_arrive'] != 'NONE') {
		$q_def .= "AND airport.name = ? ";
		array_push($param_arr, $_GET['airport_arrive']);
	}
	
	$q_def .= ") A ON flight.flight_id = A.flight_id
		WHERE flight.source = airport.airport_id
		AND airport.cid = city.city_id
		AND city.cid = country.country_id ";	
	
	if ($_GET['country_depart'] != 'NONE') {
		$q_def .= "AND country.name = ? ";
		array_push($param_arr, $_GET['country_depart']);
	}
	
	if ($_GET['city_depart'] != 'NONE') {
		$q_def .= "AND city.name = ? ";
		array_push($param_arr, $_GET['city_depart']);
	}
	
	if ($_GET['airport_depart'] != 'NONE') {
		$q_def .= "AND airport.name = ? ";
		array_push($param_arr, $_GET['airport_depart']);
	}
	
	if ($_GET['searchtype'] == 'noton') {
	
		$q_def .= "AND (NOT EXISTS (SELECT * FROM user_flight WHERE flight.flight_id = user_flight.fid) 
			OR NOT EXISTS (SELECT * FROM user_flight WHERE flight.flight_id = user_flight.fid 
			AND user_flight.uid = ?))"; 
	}		
	
	else {
		$q_def .= " AND A.c_fid = flight.flight_id AND A.c_uid = ?";
	}
	
	$q_def .= " AND flight.departure_time BETWEEN ? AND ?
		ORDER BY country.name, city.name, airport.name, flight.departure_time, 
		A.city_name, A.airport_name, A.arrival_time, flight.capacity, flight.booked";
	
	//Prepare and execute query 
	$stmt = $mysql->prepare($q_def);
		
	if (count($param_arr) === 0) {
		$stmt->bind_param("dss",$_SESSION['user_id'],$_GET['min'],$_GET['max']);
	}
	else if (count($param_arr) === 1 && $count === 0) {
		$stmt->bind_param("sdss", $param_arr[0], $_GET['min'],$_GET['max']);
	}
	else if (count($param_arr) === 2) {
		$stmt->bind_param("ssdss", $param_arr[0], $param_arr[1], $_SESSION['user_id'], $_GET['min'],$_GET['max']);
	}
	else if (count($param_arr) === 3) {
		$stmt->bind_param("sssdss", $param_arr[0], $param_arr[1], $param_arr[2], $_SESSION['user_id'],
		$_GET['min'],$_GET['max']);
	}
	else if (count($param_arr) === 4) {
		$stmt->bind_param("ssssdss", $param_arr[0], $param_arr[1], $param_arr[2], 
		$param_arr[3], $_SESSION['user_id'], $_GET['min'],$_GET['max']);
	}
	else if (count($param_arr) === 5) {
		$stmt->bind_param("sssssdss", $param_arr[0], $param_arr[1], $param_arr[2], 
		$param_arr[3], $param_arr[4], $_SESSION['user_id'], $_GET['min'],$_GET['max']);
	}
	else if (count($param_arr) === 6) {
		$stmt->bind_param("ssssssdss", $param_arr[0], $param_arr[1], $param_arr[2], 
		$param_arr[3], $param_arr[4], $param_arr[5], $_SESSION['user_id'], $_GET['min'],$_GET['max']);
	}
				
	$stmt->execute();

	//Error handling and results 
	selectResultArr($stmt, $dxml); 	
	print($dxml->asXML());	
	$stmt->close();	
}
?>