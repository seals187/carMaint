# CarMaint

A personal maintenance log for vehicles: what was done to a car, when, at what mileage and at what cost.

## Costs

**Fixed cost** (UI: "Fixkosten"):
An entry for a cost of owning a car that does not depend on driving or repairs, such as insurance, road tax or the motorway vignette; booked on the day it was paid.
_Avoid_: Insurance entry, recurring cost, overhead

## Fuel

**Refuel** (UI: "Tanken"):
An entry recording one stop at the pump: mileage, litres and amount paid.
_Avoid_: Fill-up, fuel entry, tank entry

**Full tank**:
A refuel that filled the tank to the brim; only full tanks close a consumption interval.
_Avoid_: Full fill, brim fill

**Partial refuel**:
A refuel that did not fill the tank; its litres count towards the next full tank.
_Avoid_: Top-up

**Fuel consumption**:
Fuel used per distance between two full tanks, including the litres of all partial refuels in between.
_Avoid_: Mileage (that is the odometer reading), fuel economy, efficiency

**Consumption unit**:
How a user wants fuel consumption shown (litres per 100 km or km per litre); never changes what is stored.

**Price per litre**:
Amount paid divided by litres of one refuel; derived, never entered.

**Implausible interval**:
A consumption interval that is most likely wrong (a forgotten refuel or a mistyped mileage); shown but left out of averages.
_Avoid_: Outlier, error
