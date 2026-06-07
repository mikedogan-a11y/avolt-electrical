<?php
/**
 * Plugin Name:       MortgageMD Calculators
 * Description:        Self-contained suite of the MortgageMD mortgage calculators. Drop a shortcode on any page; the plugin owns asset enqueueing (correct load order), the centralised disclaimer, and the server-side lead endpoint. Replaces per-calculator manual embedding.
 * Version:           1.0.0
 * Author:            MortgageMD
 * License:           GPL-2.0-or-later
 *
 * Why this exists
 * ---------------
 * The standalone calculators were designed to be embedded by hand: upload JS,
 * edit functions.php to enqueue with the right dependency order, paste a markup
 * block into an Elementor HTML widget, wire a lead hook. This plugin collapses
 * all of that into one install + one shortcode, so deployment of calculators
 * #1..#9 is configuration, not development.
 */

if (!defined('ABSPATH')) {
    exit;
}

define('MMD_CALC_VERSION', '1.0.0');
define('MMD_CALC_DIR', plugin_dir_path(__FILE__));
define('MMD_CALC_URL', plugin_dir_url(__FILE__));

/**
 * The 9-calculator registry. Each id maps to its embeddable HTML file, its
 * per-calculator script, and the lead tag used for ActiveCampaign / Mercury
 * source tracking (mirrors docs/LEAD-CAPTURE.md).
 */
function mmd_calc_registry() {
    return array(
        'home-loan-repayment'      => array('script' => 'home-loan-repayment.js',      'tag' => 'Calculator - Repayments'),
        'lmi-lvr'                  => array('script' => 'lmi-lvr.js',                  'tag' => 'Calculator - LMI'),
        'borrowing-power'          => array('script' => 'borrowing-power.js',          'tag' => 'Calculator - Borrowing Power'),
        'borrowing-power-drag'     => array('script' => 'borrowing-power-drag.js',     'tag' => 'Calculator - Borrowing Power Drag'),
        'purchase-costs'           => array('script' => 'purchase-costs.js',           'tag' => 'Calculator - Purchase Costs'),
        'refinance-savings'        => array('script' => 'refinance-savings.js',        'tag' => 'Calculator - Refinance'),
        'usable-equity'            => array('script' => 'usable-equity.js',            'tag' => 'Calculator - Equity'),
        'self-employed-readiness'  => array('script' => 'self-employed-readiness.js',  'tag' => 'Calculator - Self Employed'),
        'lmi-waiver-eligibility'   => array('script' => 'lmi-waiver-eligibility.js',   'tag' => 'Calculator - LMI Waiver'),
    );
}

/**
 * Pull the <section class="mmd-calc"> ... </section> block out of a calculator's
 * source HTML, i.e. exactly what the embed kits tell a human to copy by hand —
 * but read straight from the single source of truth so it can never drift.
 */
function mmd_calc_extract_block($id) {
    $file = MMD_CALC_DIR . 'calculators/' . $id . '.html';
    if (!is_readable($file)) {
        return '';
    }
    $html  = file_get_contents($file);
    $start = strpos($html, 'EMBEDDABLE UNIT START');
    $end   = strpos($html, 'EMBEDDABLE UNIT END');
    if ($start === false || $end === false) {
        return '';
    }
    // Move from the marker to the opening <section ...> and back from the end
    // marker to the closing </section>.
    $sectionStart = strpos($html, '<section', $start);
    $sectionEnd   = strrpos(substr($html, 0, $end), '</section>');
    if ($sectionStart === false || $sectionEnd === false) {
        return '';
    }
    return substr($html, $sectionStart, ($sectionEnd + strlen('</section>')) - $sectionStart);
}

/**
 * Register the per-calculator assets once. Nothing is *enqueued* here — the
 * shortcode enqueues only what a given page needs, which is what keeps this
 * page-scoped and SiteGround-Optimizer friendly (correct dependency order, no
 * site-wide bloat).
 */
add_action('wp_enqueue_scripts', function () {
    wp_register_style(
        'mmd-calculators',
        MMD_CALC_URL . 'assets/css/mmd-calculators.css',
        array(),
        MMD_CALC_VERSION
    );
    // Core MUST load before any calculator script — enforced by the dependency
    // array on each calculator handle below.
    wp_register_script(
        'mmd-core',
        MMD_CALC_URL . 'assets/js/mmd-core.js',
        array(),
        MMD_CALC_VERSION,
        true
    );
    foreach (mmd_calc_registry() as $id => $cfg) {
        wp_register_script(
            'mmd-' . $id,
            MMD_CALC_URL . 'assets/js/' . $cfg['script'],
            array('mmd-core'),
            MMD_CALC_VERSION,
            true
        );
    }
}, 5);

/**
 * The shortcode: [mmd_calc id="home-loan-repayment"]
 *
 * Replaces the entire manual embed procedure (host assets, edit functions.php,
 * paste the block into an Elementor HTML widget). Enqueues CSS + core + this
 * calculator's script in the correct order, injects the lead hook, and returns
 * the real embeddable markup.
 */
add_shortcode('mmd_calc', function ($atts) {
    $atts = shortcode_atts(array('id' => ''), $atts, 'mmd_calc');
    $id   = sanitize_key($atts['id']);
    $reg  = mmd_calc_registry();

    if (!isset($reg[$id])) {
        return current_user_can('edit_posts')
            ? '<!-- mmd_calc: unknown calculator id "' . esc_html($id) . '" -->'
            : '';
    }

    $block = mmd_calc_extract_block($id);
    if ($block === '') {
        return '<!-- mmd_calc: could not extract block for "' . esc_html($id) . '" -->';
    }

    // Enqueue exactly what this page needs.
    wp_enqueue_style('mmd-calculators');
    wp_enqueue_script('mmd-core');
    wp_enqueue_script('mmd-' . $id);

    // Wire the lead hook to the server-side REST endpoint — the one place that
    // holds the ActiveCampaign + Mercury keys (see the REST route below). This
    // is the single one-time integration the email called out. We print it on
    // wp_footer so it is independent of script load order (the hook is only
    // *invoked* on user interaction, well after page load).
    add_action('wp_footer', 'mmd_calc_print_lead_hook', 5);

    return $block;
});

function mmd_calc_print_lead_hook() {
    static $done = false;
    if ($done) {
        return; // one hook per page even if several calculators are present
    }
    $done     = true;
    $endpoint = esc_url_raw(rest_url('mmd/v1/lead'));
    $nonce    = wp_create_nonce('wp_rest');
    ?>
<script id="mmd-lead-hook">
window.MMDLeadHook=function(p){try{var b=JSON.stringify(p);
if(navigator.sendBeacon){var ok=navigator.sendBeacon(<?php echo wp_json_encode($endpoint); ?>,new Blob([b],{type:'application/json'}));if(ok)return;}
fetch(<?php echo wp_json_encode($endpoint); ?>,{method:'POST',headers:{'Content-Type':'application/json','X-WP-Nonce':<?php echo wp_json_encode($nonce); ?>},body:b,keepalive:true});
}catch(e){}};
</script>
    <?php
}

/**
 * Server-side lead endpoint: POST /wp-json/mmd/v1/lead
 *
 * This is where the ActiveCampaign + Mercury API keys live (server-side, never
 * in front-end JS). For the demo it records the lead to an NDJSON log so the
 * end-to-end flow is observable; the two forwarders below are the one-time
 * wiring task, stubbed with the exact shape each event carries.
 */
add_action('rest_api_init', function () {
    register_rest_route('mmd/v1', '/lead', array(
        'methods'             => 'POST',
        'permission_callback' => '__return_true', // lead capture is public by design
        'callback'            => 'mmd_calc_handle_lead',
    ));
});

function mmd_calc_handle_lead(WP_REST_Request $request) {
    $payload = $request->get_json_params();
    if (!is_array($payload) || empty($payload['event'])) {
        return new WP_REST_Response(array('ok' => false, 'error' => 'invalid payload'), 400);
    }

    // Observable record of the flow (demo). On production keep or drop as desired.
    $log = wp_upload_dir();
    $line = wp_json_encode(array(
        'received_at' => gmdate('c'),
        'event'       => $payload['event'],
        'calculator'  => isset($payload['calculator']) ? $payload['calculator'] : null,
        'leadTag'     => isset($payload['leadTag']) ? $payload['leadTag'] : null,
        'email'       => isset($payload['email']) ? $payload['email'] : null,
        'consent'     => isset($payload['consent']) ? $payload['consent'] : null,
        'data'        => isset($payload['data']) ? $payload['data'] : null,
    ));
    @file_put_contents(trailingslashit($log['basedir']) . 'mmd-leads.ndjson', $line . "\n", FILE_APPEND);

    // The only genuinely custom one-time work — forward to the CRMs. Stubbed so
    // the demo runs without secrets; on go-live, fill in with keys from options.
    if (($payload['event'] ?? '') === 'mmd_lead_email') {
        mmd_calc_forward_activecampaign($payload); // create/update contact + leadTag + data
        mmd_calc_forward_mercury($payload);        // push enquiry/lead record
    }

    return new WP_REST_Response(array('ok' => true), 200);
}

function mmd_calc_forward_activecampaign($payload) {
    $key = get_option('mmd_ac_api_key');
    $url = get_option('mmd_ac_api_url');
    if (!$key || !$url) {
        return; // not wired yet — demo path
    }
    // POST $url/api/3/contact/sync with the email, then add a tag matching
    // $payload['leadTag'], then map $payload['data'] to custom fields.
    // (Implementation is ~40 lines of wp_remote_post; one-time.)
}

function mmd_calc_forward_mercury($payload) {
    $key = get_option('mmd_mercury_api_key');
    if (!$key) {
        return; // not wired yet — demo path
    }
    // POST a new enquiry/lead to Mercury with source/calculator/leadTag/data.
}

/**
 * Expose Rank Math's SEO meta keys to the REST API so the deploy script can set
 * title / description / focus keyword when it creates each landing page. This is
 * what turns "set Rank Math fields by hand" into an API call.
 */
add_action('init', function () {
    $auth = function () { return current_user_can('edit_posts'); };
    foreach (array('rank_math_title', 'rank_math_description', 'rank_math_focus_keyword') as $key) {
        register_post_meta('page', $key, array(
            'type'          => 'string',
            'single'        => true,
            'show_in_rest'  => true,
            'auth_callback' => $auth,
        ));
    }
});
