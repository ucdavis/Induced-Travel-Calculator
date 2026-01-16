var data = {}
var msas
var page = $('html, body')

page.on("scroll mousedown wheel DOMMouseScroll mousewheel keyup touchmove", function() {
  page.stop()
})

function sumCounties(countyData, facilityType) {
  return countyData.reduce(function(memo, county) {
    if (facilityType === 'class1') {
      if (county.vmt1) {
        memo.vmt += county.vmt1
      }

      if (county.lanemiles1) {
        memo.laneMiles += county.lanemiles1
      }
    } else if (facilityType === 'class2-3') {
      if (county.vmt2) {
        memo.vmt += county.vmt2
      }

      if (county.vmt3) {
        memo.vmt += county.vmt3
      }

      if (county.lanemiles2) {
        memo.laneMiles += county.lanemiles2
      }

      if (county.lanemiles3) {
        memo.laneMiles += county.lanemiles3
      }
    }
    return memo
  }, {vmt: 0, laneMiles: 0})
}

function formatCountyList(countyData) {
  if (countyData.length === 1) {
    return _.startCase(countyData[0].county.toLowerCase()) + ' County'
  }
  return countyData.reduce(function(memo, county, index) {
    if (index === countyData.length - 1) {
      memo += ' and '
    } else if (index !== 0) {
      memo += ', '
    }

    memo += _.startCase(county.county.toLowerCase())

    return memo
  }, '')
}

function pluralize(singular, plural, count) {
  if (count === 1) {
    return singular
  }

  return plural
}

function formatAsBillions(value) {
  if (value > 1000) {
    return `${roundToOneDecimal(value / 1000)} billion`
  }

  return `${Math.round(value)} million`
}

function roundToOneDecimal(value) {
  return (Math.round(value * 10 ) / 10).toFixed(1)
}

$('#selectYear').change(function() {
  $('#selectMSA').val('')
  $('#selectCounty').val('')
  $('#facilityTypeClass1').prop('checked', false)
  $('#facilityTypeClass2-3').prop('checked', false)

  $('#facilityTypeClass1').parents('.form-group').slideDown()
  $('#selectCounty').parents('.form-group').hide()
  $('#selectMSA').parents('.form-group').hide()

  $('#inputLaneMiles')
    .val('')
    .parents('.form-group').hide()

  $('#results').hide()
})

$('[name="facilityType"]').change(function() {
  var facilityType = $('[name="facilityType"]:checked').val()
  $('#selectMSA').val('')
  $('#selectCounty').val('')

  if (facilityType === 'class1') {
    $('#selectMSA').parents('.form-group').slideDown()
    $('#selectCounty').parents('.form-group').hide()
  } else if(facilityType === 'class2-3') {
    $('#selectCounty').parents('.form-group').slideDown()
    $('#selectMSA').parents('.form-group').hide()
  }

  $('#inputLaneMiles')
    .val('')
    .parents('.form-group').hide()

  $('#results').hide()
})

$('#selectMSA, #selectCounty').change(function() {
  $('#inputLaneMiles').val('')

  if ($(this).val() === '') {
    $('#inputLaneMiles').parents('.form-group').hide()
    return
  }

  $('#results').hide()
  $('#inputLaneMiles').parents('.form-group').slideDown()
})

$('#vmtForm').submit(function(e) {
  e.preventDefault();

  $('#results').hide()

  var year = $('#selectYear').val()
  var facilityType = $('[name="facilityType"]:checked').val()
  var newLaneMiles = parseFloat($('#inputLaneMiles').val())
  var county = $('#selectCounty').val()
  var msa = $('#selectMSA').val()

  $('#inputLaneMiles').removeClass('is-invalid')

  // Validate Miles
  if (isNaN(newLaneMiles)) {
    $('#inputLaneMiles').addClass('is-invalid')
    return;
  } else if (newLaneMiles < 0) {
    $('#inputLaneMiles').addClass('is-invalid')
    alert('This calculator cannot be used to estimate VMT effects of capacity reductions or lane type conversions.')
  }

  var countyData

  if (facilityType === 'class1') {
    var msaData = _.find(msas, {msa: msa.toUpperCase()})

    countyData = _.filter(data[year], function(item) {
      return _.includes(msaData.counties, item.county)
    })
  } else if (facilityType === 'class2-3') {
    countyData = _.filter(data[year], {county: county.toUpperCase()})
  }

  var results = sumCounties(countyData, facilityType)
  var elasticity = facilityType === 'class1' ? 1 : 0.75
  var newVMT = roundToOneDecimal(newLaneMiles / results.laneMiles * results.vmt * elasticity)
  var newVMTLowConfidence = roundToOneDecimal(newVMT * 0.8)
  var newVMTHighConfidence = roundToOneDecimal(newVMT * 1.2)
  var currentLaneMiles = roundToOneDecimal(results.laneMiles)

  $('#resultsNone').toggle(results.laneMiles === 0);
  $('#resultsExist').toggle(results.laneMiles !== 0);

  if (msa === 'Napa') {
    $('#resultsNoneNapa').show()
    $('#resultsNoneOther').hide()
  } else {
    $('#resultsNoneNapa').hide()
    $('#resultsNoneOther').show()
  }

  $('#resultsMain').text(newVMT + ' million additional VMT/year')
  $('#yearName').text(year)

  if (facilityType === 'class1') {
    $('#geographyName').text(msa + ' MSA')
    $('#facilityType').text('Interstate highway')
    $('#currentLaneMiles').text(currentLaneMiles + ' lane miles')
    $('#currentVMT').text(formatAsBillions(results.vmt))
    $('#elasticity').text('1.0')
    $('#newLaneMiles').text(newLaneMiles + ' lane miles')
    $('#newVMT').text(newVMT + ' million')
    $('#newVMTConfidence').text(`${newVMTLowConfidence} - ${newVMTHighConfidence} million VMT`)
    $('#msaNotes').html('<p><small>' + msa + ' MSA consists of ' + countyData.length + ' ' + pluralize('county','counties', countyData.length) + ' (' + formatCountyList(countyData) + ').</small></p>')
    $('#geographyNameNone').text(msa + ' MSA')
  } else if (facilityType === 'class2-3') {
    $('#geographyName').text(county + ' County')
    $('#facilityType').text('Caltrans-managed class 2 and 3 facilities')
    $('#currentLaneMiles').text(currentLaneMiles + ' lane miles')
    $('#currentVMT').text(formatAsBillions(results.vmt) + ' million')
    $('#elasticity').text('0.75')
    $('#newLaneMiles').text(newLaneMiles + ' lane miles')
    $('#newVMT').text(newVMT + ' million')
    $('#newVMTConfidence').text(`${newVMTLowConfidence} - ${newVMTHighConfidence} million VMT`)
    $('#msaNotes').html('')
    $('#geographyNameNone').text(county + ' County')
  }

  $('#results').show()
  page.animate({ scrollTop: $(document).height() }, 2000)

  if (window.gtag) {
    gtag('event', 'click', {
      event_category: 'calculate',
      event_label: facilityType === 'class1' ? msa : county,
      value: newLaneMiles
    });
  }
})


const fetchYearData = async (year) => {
  const response = await fetch(`/data/data-${year}.json`)
  if (!response.ok) {
    console.error(`Failed to fetch data for year ${year}`)
    return
  }
  const yearData = await response.json()

  data[year] = yearData.map(item => {
    return {
      ...item,
      county: item.county.toUpperCase(),
    }
  })
}

const fetchMSAs = async () => {
  const response = await fetch('/data/msas.json')
  if (!response.ok) {
    console.error('Failed to fetch MSAs')
    return
  }
  msas = await response.json()
}

// On page load, get data
['2024', '2023', '2022', '2019', '2018', '2017', '2016'].forEach(year => {
  fetchYearData(year)
})
fetchMSAs()

// On page load, if there is a selection, trigger change
if ($('[name="facilityType"]:checked').val()) {
  $('[name="facilityType"]').trigger('change')
}

if ($('#selectMSA:visible, #selectCounty:visible').val()) {
  $('#selectMSA:visible, #selectCounty:visible').trigger('change')
}
