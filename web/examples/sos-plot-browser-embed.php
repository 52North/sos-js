<?php
/******************************************************************************
* Project: SOS
* Module:  sos-plot-browser-embed.php
* Purpose: Simple embeddable SOS.Plot client
* Author:  Paul M. Breen
* Date:    2013-03-05
* Id:$
******************************************************************************/

/* Get any passed parameters, otherwise fallback to sensible defaults */
$url = (!empty($_POST['url']) ? $_POST['url'] : (!empty($_GET['url']) ? $_GET['url'] : "http://localhost:8080/default/sos"));
$offeringId = (!empty($_POST['offeringId']) ? $_POST['offeringId'] : (!empty($_GET['offeringId']) ? $_GET['offeringId'] : "default"));
$observedProperty = (!empty($_POST['observedProperty']) ? $_POST['observedProperty'] : (!empty($_GET['observedProperty']) ? $_GET['observedProperty'] : "default"));
$startDatetime = (!empty($_POST['startDatetime']) ? $_POST['startDatetime'] : (!empty($_GET['startDatetime']) ? $_GET['startDatetime'] : NULL));
$endDatetime = (!empty($_POST['endDatetime']) ? $_POST['endDatetime'] : (!empty($_GET['endDatetime']) ? $_GET['endDatetime'] : NULL));
$relativeTime = (!empty($_POST['relativeTime']) ? $_POST['relativeTime'] : (!empty($_GET['relativeTime']) ? $_GET['relativeTime'] : "rollingday"));
$yaxisMin = (!empty($_POST['yaxisMin']) ? $_POST['yaxisMin'] : (!empty($_GET['yaxisMin']) ? $_GET['yaxisMin'] : NULL));
$yaxisMax = (!empty($_POST['yaxisMax']) ? $_POST['yaxisMax'] : (!empty($_GET['yaxisMax']) ? $_GET['yaxisMax'] : NULL));
$showOverview = (!empty($_POST['showOverview']) ? $_POST['showOverview'] : (!empty($_GET['showOverview']) ? $_GET['showOverview'] : "true"));

/* Construct a yaxis object if we were given explicit axis limits */
if(isset($yaxisMin) || isset($yaxisMax))
{
  $yaxis = "var yaxis = {};";

  if(isset($yaxisMin))
  {
    $yaxis .= " yaxis.min = $yaxisMin;";
  }
  if(isset($yaxisMax))
  {
    $yaxis .= " yaxis.max = $yaxisMax;";
  }
}

/* Output the required javascript to create the SOS.Plot, based on the
   arguments passed to this script, handling optional arguments as necessary */
echo <<<EOF
  <script type="text/javascript">
    function init() {

EOF;

if(isset($yaxis))
{
  echo "      $yaxis\n";
}

echo <<<EOF
      var options = {
        url: "$url",
        offeringId: "$offeringId",
        observedProperty: "$observedProperty",

EOF;

/* We use explicit start/end datetimes in preference to a relative time */
if(isset($startDatetime) && isset($endDatetime))
{
  echo "        startDatetime: \"$startDatetime\",\n";
  echo "        endDatetime: \"$endDatetime\",\n";
}
else
{
  echo "        relativeTime: \"$relativeTime\",\n";
}

echo <<<EOF
        config: {

EOF;

if(isset($yaxis))
{
  echo "          plot: {options: {yaxis: yaxis}},\n";
}

echo <<<EOF
          overview: {options: {show: $showOverview}}
        }
      };
      var plot = new SOS.Plot(options);
      plot.display();
    }
  </script>
EOF;
?>
