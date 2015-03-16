/*On load */
/*These functions prepare the starting tables. Tables with foreign key 
references are updated dynamically when the corresponding value from
the reference table is selected*/
window.onload = function() {
	fillLists('country'); 
	updateTimes('year', fillYears); 
	fillTimes('hour', 0, 23);
	fillTimes('minutes', 0, 59); 
	fillCrew(); 
};

/*FUNCTION: to_user()
Moves user to the main user page*/
function to_user() {
	window.location="MainPage.html";
}

/*FUNCTION: adminSimpleMod
Description: Handles direct selections, deletions, and insertions
into tables (like the country table or crew member table)that 
are not dependent on foreign keys 
*/
function adminSimpleMod(_table, _type, _field) {
     	
	var _response = _table + "_Resp"; 
	
	//Error test - don't send blank fields to PHP 
	if (document.getElementById(_field).value != '') {
		var req = new XMLHttpRequest();
		var url = 'admin.php';

		if (!req) {
			  throw 'Unable to create HttpRequest.';
		}
		
		//Make URL			
		url += '?action_type=simple&action=' + _type;	
		url += '&table=' + _table; 
		url += '&text_var=' + document.getElementById(_field).value;
					
		req.open('GET', url, true);
		
		//Print out results and dynamically update tables 		
		req.onreadystatechange = function() {	
			if (this.readyState == 4) {
				document.getElementById(_response).innerHTML=req.responseText;
				if(_type != 'select') {
					clearLists(_table); 
					if(_table === 'crew') {
						fillCrew(); 
					}
					else {
						fillLists(_table);
					}
				}
			}
		};
		
		 //Send the request
		 req.send(null);
	}
	
	else {
		document.getElementById(_response).innerHTML="Your entry cannot be blank!"; 
	}
}

/*FUNCTION: adminFKMod
Description: Handles direct selections, deletions, and insertions
into tables such as the city table or the airport table where the 
unique value depends on a foreign key 
*/
function adminFKMod(_table, _type, _field, _fk, _ref, _refVal) {
     	
	//ID to determine the location in the HTML document to print out result of operation 
	var _response = _table + "_Resp"; 
	
	//Entries cannot be blank
	if (document.getElementById(_field).value === '') {
		document.getElementById(_response).innerHTML="Your entry cannot be blank!"; 
	}
	
	else if (document.getElementById(_refVal).value === 'NONE') {
		document.getElementById(_response).innerHTML="The " + _ref + " field cannot be blank!";
	}
	
	//Proceed to send request if input is validated 
	else {
		var req = new XMLHttpRequest();
		var url = 'admin.php';

		if (!req) {
			  throw 'Unable to create HttpRequest.';
		}
		
		//Create the URL 
		url += '?action_type=fk&action=' + _type;	
		url += '&table=' + _table; 
		url += '&text_var=' + document.getElementById(_field).value; 
		url += '&fk=' + _fk;
		url += '&ref=' + _ref;
		url += '&refVal=' + document.getElementById(_refVal).value; 
					
		req.open('GET', url, true);
					
		/*Print out result of the operation.*/
		req.onreadystatechange = function() {	
			if (this.readyState == 4) {
				document.getElementById(_response).innerHTML=req.responseText;
				if(_type != 'select') {
					clearLists(_table); 
				}
			}
		};
		
		 //Send the request
		 req.send(null);
	}
}

/*FUNCTION: addFlight
Description: Specialized function to handle the most complex insertion-
additions to the flight table
*/
function addFlight () {
	
	//Make datetime objects for arrival, departure date times
	var depart_date = new Date();
	depart_date.setFullYear(depart_time_year.value); 
	depart_date.setMonth(depart_time_month.value);
	depart_date.setDate(depart_time_day.value);
	depart_date.setHours(depart_time_hour.value);
	depart_date.setMinutes(depart_time_minutes.value);
	depart_date.setSeconds(0); 
	
	//Build arrival date
	var arrive_date = new Date();
	arrive_date.setFullYear(arrive_time_year.value); 
	arrive_date.setMonth(arrive_time_month.value);
	arrive_date.setDate(arrive_time_day.value);
	arrive_date.setHours(arrive_time_hour.value);
	arrive_date.setMinutes(arrive_time_minutes.value);
	arrive_date.setSeconds(0); 
	
	//Set the booked and capacity attributes 
	var booked = parseInt(document.getElementById('booked').value);
	var capacity = parseInt(document.getElementById('capacity').value);
	
	//Error testing - can't go back in time!
	if (arrive_date.getTime() <= depart_date.getTime()) {
		document.getElementById('flight_Resp').innerHTML = 
			'Our planes aren\'t that fast!!!'
	}
	
	//Validate numeric input
	else if (isNaN(booked) || isNaN(capacity)) {
		document.getElementById('flight_Resp').innerHTML = 
			'Invalid entry for flight capacity or number flights booked! Must be an integer!'; 
	}
	
	else if (capacity < 1 || capacity > 500 || booked < 0) {
		document.getElementById('flight_Resp').innerHTML = 
			'Please verify capacity and amount of booked flights are in range!'; 
	}
	
	else if (booked > capacity) {
		document.getElementById('flight_Resp').innerHTML = 
			'You can\'t fit that many people on that plane!'; 
	}
	
	//Flights require both destination and departure points
	else if (airport_depart.value == 'NONE' || airport_arrive.value == 'NONE') {
		document.getElementById('flight_Resp').innerHTML = 
			'Two airports must be selected!'; 
	}
	
	//Proceed to send request 
	else {
		var req = new XMLHttpRequest();
		var url = 'admin.php';

		if (!req) {
			  throw 'Unable to create HttpRequest.';
		}
		
		//Create URL 
		url += '?action_type=flight&action=add_flight'
		url += '&source=' + airport_depart.value;  
		url += '&destination=' + airport_arrive.value;
		url += '&depart=' + depart_date.toISOString();
		url += '&arrive=' + arrive_date.toISOString();
		url += '&capacity=' + document.getElementById('capacity').value;
		url += '&booked=' + document.getElementById('booked').value;
		
		console.log(url); 

		req.open('GET', url, true);
					
		//Report results 
		req.onreadystatechange = function() {	
			if (this.readyState == 4) {
				document.getElementById('flight_Resp').innerHTML=req.responseText;
			}
		};
		
		 //Send the request
		 req.send(null);		
	}		
}

/*FUNCTION: searchFlights
Description: Specialized function to handle selections from the flight table
16 different varieties of query are possible, depending on the specificity of 
the search (anywhere to anywhere being least specific, and airport to airport
being most specific). All flights are passed with two datetime fields. 
*/
function searchFlights (button_maker, _ID) {

	//Lower bound of datetime range
	var min_date = new Date();
	min_date.setFullYear(user_min_time_year.value); 
	min_date.setMonth(user_min_time_month.value);
	min_date.setDate(user_min_time_day.value);
	min_date.setHours(user_min_time_hour.value);
	min_date.setMinutes(user_min_time_minutes.value);
	min_date.setSeconds(0); 
	
	//Upper bound of datetime range
	var max_date = new Date();
	max_date.setFullYear(user_max_time_year.value); 
	max_date.setMonth(user_max_time_month.value);
	max_date.setDate(user_max_time_day.value);
	max_date.setHours(user_max_time_hour.value);
	max_date.setMinutes(user_max_time_minutes.value);
	max_date.setSeconds(0); 

	//Validate input 
	if (max_date.getTime() < min_date.getTime()) {
		document.getElementById('flight_Results').innerHTML = 
			'They are planes, not time machines ...'
	}
	
	//Proceed to request
	else {
		var req = new XMLHttpRequest();
		var url = 'admin.php';

		if (!req) {
			  throw 'Unable to create HttpRequest.';
		}
		
		//Build URL
		url += '?action_type=flight&action=select'
		url += '&country_depart=' + user_country_depart.value;  
		url += '&country_arrive=' + user_country_arrive.value;
		url += '&city_depart=' + user_city_depart.value;
		url += '&city_arrive=' + user_city_arrive.value;
		url += '&airport_depart=' + user_airport_depart.value;
		url += '&airport_arrive=' + user_airport_arrive.value;
		url += '&min=' + min_date.toISOString();
		url += '&max=' + max_date.toISOString(); 	
		
		req.open('GET', url, true);
					
		//Flight selections will be presented as a table 
		req.onreadystatechange = function() {	
			if (this.readyState == 4) {
				makeTable(req, button_maker, _ID);
			}
		};
		
		 //Send the request
		 req.send(null);		
	}			
}

/*FUNCTION: searchFlightsStaff
Description: Handles searches for crew members
*/
function searchFlightsStaff (button_maker, _search, _ID) {

	//Input field cannot be NONE 
	if (document.getElementById('all_crew_name').value == 'NONE') {
		document.getElementById('flight_Results').innerHTML = 'You must select a crew member!'; 
	}
	
	else {
		var req = new XMLHttpRequest();
		var url = 'admin.php';
		var crewList = document.getElementById('all_crew_name');

		if (!req) {
			  throw 'Unable to create HttpRequest.';
		}
		
		url += '?action_type=flight&action=getstaff';
		url += '&searchtype=' + _search; 
		url += '&crew_number=' + crewList.options[crewList.selectedIndex].value;
		
		req.open('GET', url, true);
						
		req.onreadystatechange = function() {	
		
			if (this.readyState == 4) {
				makeTable(req, button_maker, _ID);
			}
		};
			
		//Send the request
		 req.send(null);	
	}	
}

/*FUNCTION: fillListByID
Description: For use with populating a single menu with
all valid values 
*/
function fillListByID(_ref, _table, _fk, _refID, _ID) {
     		
	//Clear list before repopulating 
	clearListByID(_ID);
		
	var req = new XMLHttpRequest();
    var url = 'admin.php';
	
    if (!req) {
          throw 'Unable to create HttpRequest.';
    }
			
	//Build URL 		
	url += '?action_type=fk&action=select';	
	url += '&ref=' + _ref;
	url += '&table=' + _table; 
	url += '&fk=' + _fk;
	url += '&refVal=' + document.getElementById(_refID).value; 
	
	req.open('GET', url, true);
				
	req.onreadystatechange = function() {	
		if (this.readyState == 4) {		
			
			var option_value; 
			var option; 
		
			var amount_options = req.responseXML.getElementsByTagName("xml")[0].childNodes.length;
			
			//If request is successful, repopulate the list 
			for (var i = 0; i < amount_options; i++) {
				
				option_value = req.responseXML.getElementsByTagName("new_option")[i].innerHTML;
				option = document.createElement("option");
				option.innerHTML = option_value; 
				option.value = option_value; 
				document.getElementById(_ID).appendChild(option);
			}
		}
	};

     //Send the request
	 req.send(null);
}

/*FUNCTION: fillLists
Description: For use with populating all menus with the same name with valid values 
*/
function fillLists(_table) {
		
	var req = new XMLHttpRequest();
    var url = 'admin.php';
	
     if (!req) {
          throw 'Unable to create HttpRequest.';
    }
		
	url += '?action_type=simple&action=select';	
	url += '&table=' + _table; 
			
	req.open('GET', url, true);
				
	req.onreadystatechange = function() {	
		if (this.readyState == 4) {		
			
			var option_value; 
			var option; 
		
			var amount_options = req.responseXML.getElementsByTagName("xml")[0].childNodes.length;
			var menus = document.getElementsByName(_table); 
			var amount_menus = menus.length; 
			
			//If selection from database was successful, repopulate the cleared lists 
			for (var i = 0; i < amount_options; i++) {
				
				for (var j = 0; j < amount_menus; j++) {
					
					option_value = req.responseXML.getElementsByTagName("new_option")[i].innerHTML;
					option = document.createElement("option");
					option.innerHTML = option_value; 
					option.value = option_value; 
					document.getElementsByName(_table)[j].appendChild(option);
				}
			}
		}
	};

     //Send the request
	 req.send(null);
}

/*FUNCTION: fillCrew
Description: Specialized function for dealing with filling the crew member list.
Each crew member is listed with ID number in order to distinguish between 
duplicate names 
*/
function fillCrew() {
		
	var req = new XMLHttpRequest();
    var url = 'admin.php';
	
     if (!req) {
          throw 'Unable to create HttpRequest.';
    }
		
	url += '?action_type=simple&action=select&table=crew';	
			
	req.open('GET', url, true);
				
	req.onreadystatechange = function() {	
		if (this.readyState == 4) {		
			
			var option_value; 
			var option; 
			var list_item; 
			var amount_options = req.responseXML.getElementsByTagName("xml")[0].childNodes.length;
			
			//Add the basic NONE option 
			option = document.createElement("option");
			option.innerHTML = 'NONE';
			option.value = 'NONE'; 
			document.getElementById('all_crew_name').appendChild(option); 
			
			//Build a string from the user's name and ID and add it to the list of crew members
			for (var i = 0; i < amount_options; i++) {
				
				list_item = req.responseXML.getElementsByTagName("xml")[0].childNodes[i];
				
				if (list_item.tagName === 'row') {
					option = document.createElement("option");
					option.value = list_item.innerHTML; 
				}
		
				else if (list_item.tagName === 'column') {
					option.innerHTML = list_item.innerHTML + " ID: " + option.value; 
				}
				
				else {
					document.getElementById('all_crew_name').appendChild(option);
				}
			}	
		}
	};

     //Send the request
	 req.send(null);
}

/*FUNCTION: fillCrew
Description: Specialized function for dealing with filling the crew member list.
Each crew member is listed with ID number in order to distinguish between 
duplicate names 
*/
function clearListByID (_menu) {
	
	var menu = document.getElementById(_menu);
	
	while (menu.firstChild) {
		menu.removeChild(menu.firstChild);
	}
	
	option = document.createElement("option");
	option.innerHTML = 'NONE';
	option.value = 'NONE'; 
	menu.appendChild(option); 
}

/*FUNCTION: clearLists
Description: clears all lists with a given name 
*/
function clearLists(_menu) {
	
	var menus = document.getElementsByName(_menu); 
	var amount_menus = menus.length; 
	
	for (var i = 0; i < amount_menus; i++) {
		while (menus[i].firstChild) {
			menus[i].removeChild(menus[i].firstChild);
		}
		
		//Add the basic NONE entry
		option = document.createElement("option");
		option.innerHTML = 'NONE';
		option.value = 'NONE'; 
		menus[i].appendChild(option);		
	}
}

/*FUNCTION: clearLists
Description: Takes a function and updates times
(days, hours, etc.) 
*/
function updateTimes(_name, _updater) {
	var menus = document.getElementsByName(_name); 
	var amount_menus = menus.length; 
	
	for (i = 0; i < amount_menus; i++) {
		
		while (menus[i].firstChild) {
			menus[i].removeChild(menus[i].firstChild);
		}
	
		_updater(menus[i]); 
	}
}

/*FUNCTION: clearLists
Description: Fills the year fields in on the HTML page. Two years are
available - through the current year and the entirety of next year
*/
function fillYears(_menu) {
	
	var date = new Date(); 
	
	//Present year
	option = document.createElement("option");
	option.innerHTML = date.getFullYear();
	option.value = date.getFullYear();
	_menu.appendChild(option);
	
	//Next year
	option = document.createElement("option");
	option.innerHTML = date.getFullYear() + 1;
	option.value = date.getFullYear() + 1;
	_menu.appendChild(option);
	
	//Display only those months available in the selected year
	updateMonths(_menu, _menu.id.replace("year", "month"));  
}

/*FUNCTION: updateMonths 
Description: 
Displays the months in a drop down menu to match the corresponding year field */
function updateMonths(_caller, _ID) {
	
	var menu = document.getElementById(_ID); 
	var date = new Date(); 
	var start_month; 
	 
	var months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 
		'September', 'October', 'November', 'December']; 
		
	//Clear the list before repopulating 
	while (menu.firstChild) {
		menu.removeChild(menu.firstChild);
	}
	
	//Present year will have less months available except in January
	if (_caller.value == date.getFullYear()) {
		start_month = date.getMonth();
	}
	
	else {
		start_month = 0; 
	}
	
	for (var i = start_month; i < 12; i++) {

		option = document.createElement("option");
		option.innerHTML = months[i];
		option.value = i; 
		menu.appendChild(option);
	}
	
	//Now update the day menu to present the correct amount of days for the month
	updateDays(menu, menu.id.replace("month", "day"));  
}

/*FUNCTION: updateDays
Description: Determines the dates that should be displayed in a drop down menu
*/
function updateDays (_caller, _ID) { 
	
	var menu = document.getElementById(_ID); 
	var date = new Date(); 
	var month = document.getElementById(_caller.id).value; 
	var year = document.getElementById(menu.id.replace("day", "year")).value;
	var days = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
	var start_day = 1; 
	
	//Clear list before repopulating 
	while (menu.firstChild) {
		menu.removeChild(menu.firstChild);
	}
	
	//Leap year!
	if ((year % 4) == 0) {
		days[1]++; 
	}
	
	//Present month will have less days unless the 1st
	if (year == date.getFullYear() && month == date.getMonth()) {
		start_day = date.getDate();
	}
	
	//Add options 
	for (var i = start_day; i <= days[month]; i++) {
		option = document.createElement("option");
		option.innerHTML = i;
		option.value = i; 
		menu.appendChild(option);
	}
}

/*FUNCTION: fillTimes
Fills a drop down menu with hours and minutes in a range 
bewteen _cur and _limit 
*/
function fillTimes (_name, _cur, _limit) { 
 
	var menus = document.getElementsByName(_name); 
	var amount_menus = menus.length; 
	var string_num;
	
	for (var i = 0; i < amount_menus; i++) {
		while (menus[i].firstChild) {
			menus[i].removeChild(menus[i].firstChild);
		}

		//Single digits should be displayed with a zero by convention
		for (var j = _cur; j <= _limit; j++) {
			option = document.createElement("option");
			if (j < 10) {
				string_num = '0' + j;
			}
			else {
				string_num = j; 
			}
			option.innerHTML = string_num;
			option.value = string_num; 
			menus[i].appendChild(option);
		}
	}
}

/*FUNCTION: makeTableHeaders- creates the headings for columns for the
flight table
*/
function makeTableHeaders (headers, heading) {
	var header = document.createElement("th");
	header.innerHTML = heading; 
	headers.appendChild(header); 
}

/*FUNCTION: makeTable- creates a list of flights and appends a button 
using the passed function which will have varying functionality 
depending on the kind of search - e.g., a search for all flights
with a given crew member will have a button allowing the user to 
remove that crew member from that flight 
*/
function makeTable (req, button_maker, _ID) {
	
	//First make the table and the headers for each column
	var option_value; 
	var option; 
	var table = document.createElement("table"); 
	var headers = document.createElement("thead");
	
	makeTableHeaders(headers, "Departure Country"); 
	makeTableHeaders(headers, "Departure City");
	makeTableHeaders(headers, "Departure Airport"); 	
	makeTableHeaders(headers, "Departure Time");
	makeTableHeaders(headers, "Arrival Country"); 
	makeTableHeaders(headers, "Arrival City");
	makeTableHeaders(headers, "Arrival Airport"); 	
	makeTableHeaders(headers, "Arrival Time");
	makeTableHeaders(headers, "Flight Capacity");
	makeTableHeaders(headers, "Flights Booked");
	
	table.appendChild(headers); 
	
	//Then make the rows, each row including one button 
	var amount_options = req.responseXML.getElementsByTagName("xml")[0].childNodes.length;
	var row;
	var column; 
	var button; 
	
	for (var i = 0; i < amount_options; i++) {
		
		//Start a new row
		if (req.responseXML.getElementsByTagName("xml")[0].childNodes[i].tagName === 'row') {
			row = document.createElement("tr");
			row.id = req.responseXML.getElementsByTagName("xml")[0].childNodes[i].innerHTML; 
		}
		
		//Fill in the values for each column
		else if (req.responseXML.getElementsByTagName("xml")[0].childNodes[i].tagName === 'column') {
			column = document.createElement("td"); 
			column.innerHTML = 
				req.responseXML.getElementsByTagName("xml")[0].childNodes[i].innerHTML;
			row.appendChild(column); 
		}	
		
		//Append the row to the table 
		else {
			button = document.createElement('button');
			button_maker(button, i, row); 
			column = document.createElement("td");
			column.appendChild(button); 
			row.appendChild(column); 
			table.appendChild(row); 
		}
	}	

	//Remove the existing table and append the new one 	
	while(document.getElementById("flight_Results").firstChild) {
		document.getElementById("flight_Results").removeChild(
			document.getElementById("flight_Results").firstChild);
	}
	document.getElementById(_ID).appendChild(table);
}

/*FUNCTION: bookFlight - button making function- creates the button to add a booking
to a flight 
*/
function bookFlight (button, id_num, row) {
	
	var booked; 
	button.id = "add" + id_num; 
	
	//Validate input -can't overbook the flight (ideal world ...) 
	if (Number(row.childNodes[9].innerHTML) === Number(row.childNodes[8].innerHTML)) {
		button.appendChild(document.createTextNode('This Flight is Full!'));
	}
	
	else {
		button.appendChild(document.createTextNode('Book This Flight!'));
		button.onclick = function() {
			booked = Number(row.childNodes[9].innerHTML);
			if (Number(row.childNodes[9].innerHTML) < Number(row.childNodes[8].innerHTML)) {
				booked += 1;
				row.childNodes[9].innerHTML = booked; 	
				row.childNodes[9].innerHTML = booked; 
				sendBooking(row);		
			}
			else {
				button.innerHTML = 'This Flight is Full!';
			}
		}
	}
}

/*FUNCTION: deleteFlights - creates the button to remove a flight from the list 
*/
function deleteFlights (button, id_num, row) {
	
	button.id = "delete" + id_num; 
	
	button.appendChild(document.createTextNode('Delete This Flight'));
	button.onclick = function() {
		sendDeleteFlight(row);	
		row.parentNode.removeChild(row);
	}
}

/*FUNCTION: staffFlights - creates the button to add a crew member to a flight
*/
function staffFlights (button, id_num, row) {
	
	button.id = "staff" + id_num; 
	
	button.appendChild(document.createTextNode('Assign to This Flight'));
	button.onclick = function() {
		sendStaffFlight(row);	
		row.parentNode.removeChild(row);
	}
}

/*FUNCTION: destaff - creates the button to remove a crew member from a flight 
*/
function destaffFlights (button, id_num, row) {
	
	button.id = "destaff" + id_num; 
	
	button.appendChild(document.createTextNode('Remove From This Flight'));
	button.onclick = function() {
		deleteStaffFlight(row);	
		row.parentNode.removeChild(row);
	}
}

/*FUNCTION: sendBooking - submits an update to the database when a flight is booked
(book a flight button was pressed) 
*/
function sendBooking (row) {

	var req = new XMLHttpRequest();
    var url = 'admin.php';
	
     if (!req) {
          throw 'Unable to create HttpRequest.';
    }
		
	url += '?action_type=flight&action=book';
	url += '&flight_number=' + row.id; 
			
	req.open('GET', url, true);
				
     //Send the request
	 req.send(null);
}

/*FUNCTION: sendBooking - submits an update to the database when a flight is deleted
(bdelete a flight button was pressed) 
*/
function sendDeleteFlight (row) {
	
	var req = new XMLHttpRequest();
    var url = 'admin.php';
	
	if (!req) {
          throw 'Unable to create HttpRequest.';
    }
	
	url += '?action_type=flight&action=delete';
	url += '&flight_number=' + row.id; 
	
	req.open('GET', url, true);
				
     //Send the request
	req.send(null);	
}

/*FUNCTION: sendStaffFlight- submits an update to the database when a crew member 
is added to a flight (staff flight button was pressed) 
*/
function sendStaffFlight (row) {
	
	var req = new XMLHttpRequest();
    var url = 'admin.php';
	var crewList = document.getElementById('all_crew_name'); 
	
	if (!req) {
          throw 'Unable to create HttpRequest.';
    }
	
	url += '?action_type=flight&action=staff'
	url += '&flight_number=' + row.id;
	url += '&crew_number=' + crewList.options[crewList.selectedIndex].value;
	
	console.log(url); 
	
	req.open('GET', url, true);
				
     //Send the request
	req.send(null);	
}

/*FUNCTION: deleteStaffFlight- submits an update to the database when a crew 
member is added to a flight (delete staff flight was pressed) 
*/
function deleteStaffFlight (row) {
	
	var req = new XMLHttpRequest();
    var url = 'admin.php';
	var crewList = document.getElementById('all_crew_name'); 
	
	if (!req) {
          throw 'Unable to create HttpRequest.';
    }
	
	url += '?action_type=flight&action=destaff'
	url += '&flight_number=' + row.id;
	url += '&crew_number=' + crewList.options[crewList.selectedIndex].value;
	
	console.log(url); 
	
	req.open('GET', url, true);
				
     //Send the request
	req.send(null);	
}

/*FUNCTION: clearNodesByID - Removes all child nodes of the node with the given ID */
function clearNodeById (_ID) {
	console.log('hey');
	node = document.getElementById(_ID);
	while (node.firstChild) {
		node.removeChild(node.firstChild);
	}	
}