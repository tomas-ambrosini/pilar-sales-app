import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Plus, Minus, Trophy, Medal, Globe2, BarChart3, Presentation } from 'lucide-react';

const TEAM_META = {
    // America

    // Europe

    // Africa

    // Asia & Oceania
'USA': { continent: 'America', flag: '🇺🇸', rank: 1, code: 'USA', topBlockStyle: { background: 'linear-gradient(to right, #B31942, #FFFFFF, #0A3161)' } },
'Mexico': { continent: 'America', flag: '🇲🇽', rank: 2, code: 'MEX', colorOverride: '#8A9A5B' },
'Argentina': { bgPosition: '0px -15px', continent: 'America', flag: '🇦🇷', rank: 3, code: 'ARG', cups: 3, colorOverride: '#75AADB' },
'Brazil': { bgPosition: '0px -15px', continent: 'America', flag: '🇧🇷', rank: 4, code: 'BRA', cups: 5, colorOverride: '#009B3A' },
'Colombia': { continent: 'America', flag: '🇨🇴', rank: 5, code: 'COL', colorOverride: '#FCD116' },
'England': { continent: 'Europe', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', rank: 1, code: 'ENG', cups: 1, colorOverride: '#FFFFFF', dividerClass: 'border-gray-200', topBlockClass: '!bg-white !text-black' },
'France': { bgPosition: '0px -25px', continent: 'Europe', flag: '🇫🇷', rank: 2, code: 'FRA', cups: 2, colorOverride: '#002395' },
'Spain': { bgPosition: '0px -25px', continent: 'Europe', flag: '🇪🇸', rank: 3, code: 'ESP', cups: 1, colorOverride: '#AA151B' },
'Portugal': { continent: 'Europe', flag: '🇵🇹', rank: 4, code: 'POR', colorOverride: '#800000' },
'Germany': { bgPosition: '0px 15px', continent: 'Europe', flag: '🇩🇪', rank: 5, code: 'GER', cups: 4, bgStyle: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='85' height='85' viewBox='50 95 180 210' preserveAspectRatio='xMidYMid slice'%3E %3C!-- Background --%3E %3Crect x='-1000' y='-1000' width='3000' height='3000' fill='%23654321'/%3E %3Cg fill='%23000000' opacity='0.4'%3E %3Cpath d='M 200.863281 216.839844 C 200.863281 216.839844 189.644531 179.714844 187.828125 173.765625 C 186.273438 168.667969 182.277344 168.992188 182.277344 168.992188 C 182.277344 168.992188 180.960938 169.058594 170.394531 168.9375 C 160.203125 168.832031 159.222656 171.367188 166.46875 180.921875 C 168.769531 183.957031 167.875 184.386719 161.980469 185.414062 C 156.082031 186.433594 153.265625 180.6875 152.925781 178.160156 C 152.582031 175.621094 151.277344 166.628906 151.125 166.1875 C 150.742188 165.113281 153.5 164.304688 154.84375 165.171875 C 157.316406 166.742188 156.96875 167.25 156.96875 162.578125 C 156.96875 157.898438 150.777344 158.28125 150.777344 158.28125 C 150.371094 153.332031 142.96875 154.179688 140.597656 154.335938 C 138.222656 154.496094 135.84375 156.21875 129.519531 156.21875 C 123.199219 156.21875 124.304688 164.3125 124.304688 164.3125 C 124.304688 164.3125 127.238281 163.441406 129.472656 163.5 C 131.683594 163.554688 137.414062 163.441406 135.683594 166.949219 C 135.683594 166.949219 131.097656 165.324219 128.933594 165.324219 C 126.773438 165.324219 121.589844 165.277344 120.296875 163.394531 C 119 161.507812 118.515625 160.914062 118.515625 160.914062 C 118.515625 160.914062 117.058594 166.832031 120.40625 167.429688 C 123.753906 168.023438 127.210938 167.429688 128.828125 167.324219 C 130.445312 167.207031 133.636719 167.207031 134.5 167.324219 C 135.359375 167.429688 134.441406 168.34375 132.765625 168.457031 C 131.097656 168.5625 127.261719 168.292969 128.289062 170.011719 C 129.3125 171.742188 131.097656 172.710938 132.171875 172.925781 C 133.253906 173.144531 136.222656 172.65625 134.921875 175.835938 L 134.195312 177.953125 C 133.363281 180.375 130.769531 186.085938 124.871094 185.046875 C 118.972656 184.039062 118.085938 183.605469 120.375 180.582031 C 127.625 171.015625 126.652344 168.480469 116.453125 168.585938 C 105.890625 168.707031 104.574219 168.636719 104.574219 168.636719 C 104.574219 168.636719 100.578125 168.308594 99.023438 173.40625 C 97.203125 179.355469 83.136719 217.050781 83.136719 217.050781 C 83.136719 217.050781 82.507812 220.695312 85.574219 221.714844 C 89.605469 223.042969 90.914062 219.15625 90.914062 219.15625 L 101.117188 192.167969 C 101.878906 192.640625 102.625 193.105469 103.382812 193.542969 L 90.636719 228.816406 C 90.636719 228.816406 89.335938 232.707031 93.449219 234.140625 C 97.125 235.414062 98.777344 230.839844 98.777344 230.839844 L 111.046875 197.464844 C 111.703125 197.742188 112.355469 198.019531 112.992188 198.28125 L 100.070312 235.144531 C 100.070312 235.144531 98.878906 239.097656 102.699219 240.386719 C 106.511719 241.683594 108.054688 237.15625 108.054688 237.15625 L 120.878906 200.921875 C 121.644531 201.128906 122.398438 201.316406 123.140625 201.484375 C 123.128906 201.527344 123.125 201.558594 123.125 201.558594 L 116.609375 223.296875 C 116.609375 223.296875 115.53125 227.03125 119.195312 228.464844 C 122.875 229.902344 124.882812 225.015625 124.882812 225.015625 L 130.855469 205.832031 C 130.855469 205.832031 133.304688 215.820312 128.984375 222.792969 C 124.667969 229.761719 120.433594 234.417969 114.890625 237.003906 C 114.890625 237.003906 115.039062 237.800781 117.054688 237.933594 C 119.066406 238.085938 119.210938 238.59375 119.5 238.945312 L 116.632812 243.332031 C 116.632812 243.332031 116.195312 244.910156 114.25 244.054688 C 112.304688 243.191406 109.863281 241.894531 109.863281 241.894531 C 109.863281 241.894531 107.339844 241.257812 106.761719 242.472656 L 106.1875 243.695312 C 106.1875 243.695312 103.3125 243.984375 102.945312 245.628906 C 102.589844 247.285156 103.09375 247.496094 103.09375 247.496094 C 103.09375 247.496094 104.398438 246.582031 104.960938 246.933594 C 105.730469 247.390625 105.109375 248.777344 106.003906 249.101562 C 107.613281 249.683594 108.789062 248.785156 109.648438 248.011719 C 110.210938 247.488281 111.589844 248.074219 111.65625 248.507812 C 111.730469 248.941406 111.082031 250.082031 109.425781 250.300781 C 107.773438 250.523438 104.171875 251.15625 104.382812 253.035156 C 104.570312 254.613281 104.59375 254.753906 104.601562 254.761719 C 104.582031 254.792969 103.253906 257.640625 105.972656 258.707031 C 105.972656 258.707031 106.410156 256.988281 106.980469 256.988281 C 107.554688 256.988281 108.054688 257.992188 109.066406 257.992188 C 110.074219 257.992188 111.011719 257.125 111.589844 255.40625 C 112.160156 253.675781 113.167969 251.378906 113.167969 251.378906 C 113.167969 251.378906 113.886719 250.523438 114.320312 250.660156 C 114.753906 250.808594 114.972656 251.597656 114.828125 252.09375 C 114.683594 252.609375 114.394531 253.75 114.320312 254.042969 C 114.25 254.320312 111.808594 257.347656 113.75 258.789062 C 115.6875 260.214844 115.476562 260.796875 115.972656 261.144531 C 116.480469 261.511719 118.496094 262.222656 119.21875 261.796875 C 119.21875 261.796875 118.355469 260.214844 118.136719 259.929688 C 117.917969 259.644531 117.992188 259.074219 119.355469 259.074219 C 120.730469 259.074219 120.730469 257.347656 119.867188 256.050781 C 119 254.761719 118.703125 253.515625 118.421875 252.675781 C 117.863281 250.976562 119.390625 250.367188 120.082031 252.09375 C 120.75 253.765625 120.476562 255.390625 121.953125 255.152344 C 123.054688 254.980469 123.316406 254.257812 123.820312 254.320312 C 124.328125 254.394531 125.753906 255.390625 124.988281 257.230469 C 124.988281 257.230469 128.355469 256.6875 127.210938 253.613281 C 126.453125 251.574219 125.519531 252.59375 126.128906 250.59375 C 126.597656 249.019531 125.195312 247.863281 123.535156 247.929688 C 121.984375 247.992188 119.964844 247.578125 120.949219 245.703125 C 121.984375 243.714844 123.394531 241.324219 123.394531 241.324219 L 125.765625 244.054688 C 125.765625 244.054688 128.003906 238.453125 130.015625 235.933594 C 132.03125 233.421875 134.480469 230.324219 135.628906 230.976562 C 136.78125 231.621094 137.136719 239.742188 136.207031 243.835938 C 135.269531 247.929688 131.882812 256.914062 131.097656 258.136719 C 130.304688 259.351562 135.554688 257.347656 136.207031 257.125 C 136.851562 256.914062 138.148438 255.332031 138.433594 257.777344 C 138.726562 260.214844 139.683594 264.863281 141.90625 267.246094 L 141.960938 267.1875 C 144.195312 264.816406 145.277344 260.003906 145.5625 257.558594 C 145.851562 255.121094 147.144531 256.703125 147.796875 256.914062 C 148.4375 257.125 153.695312 259.140625 152.898438 257.917969 C 152.113281 256.703125 148.730469 247.714844 147.796875 243.625 C 146.859375 239.53125 147.21875 231.402344 148.375 230.757812 C 149.523438 230.113281 151.964844 233.210938 153.980469 235.714844 C 155.996094 238.234375 158.230469 243.835938 158.230469 243.835938 L 160.605469 241.105469 C 160.605469 241.105469 162.015625 243.492188 163.054688 245.492188 C 164.03125 247.359375 162.015625 247.78125 160.464844 247.71875 C 158.800781 247.652344 157.398438 248.808594 157.875 250.375 C 158.476562 252.371094 157.546875 251.363281 156.792969 253.398438 C 155.648438 256.472656 159.007812 257.019531 159.007812 257.019531 C 158.242188 255.167969 159.667969 254.183594 160.175781 254.109375 C 160.679688 254.042969 160.941406 254.769531 162.046875 254.941406 C 163.523438 255.167969 163.253906 253.546875 163.921875 251.882812 C 164.609375 250.15625 166.136719 250.757812 165.574219 252.460938 C 165.292969 253.300781 165 254.542969 164.132812 255.835938 C 163.269531 257.125 163.269531 258.855469 164.640625 258.855469 C 166.007812 258.855469 166.082031 259.425781 165.863281 259.710938 C 165.644531 260.003906 164.78125 261.585938 164.78125 261.585938 C 165.5 262.019531 167.515625 261.292969 168.023438 260.933594 C 168.527344 260.574219 168.3125 260.003906 170.253906 258.570312 C 172.195312 257.125 169.746094 254.109375 169.679688 253.824219 C 169.601562 253.53125 169.3125 252.390625 169.171875 251.882812 C 169.03125 251.378906 169.242188 250.59375 169.679688 250.449219 C 170.109375 250.300781 170.828125 251.15625 170.828125 251.15625 C 170.828125 251.15625 171.835938 253.464844 172.414062 255.1875 C 172.984375 256.914062 173.929688 257.777344 174.929688 257.777344 C 175.941406 257.777344 176.441406 256.769531 177.019531 256.769531 C 177.59375 256.769531 178.027344 258.496094 178.027344 258.496094 C 180.746094 257.417969 179.414062 254.582031 179.398438 254.550781 C 179.402344 254.542969 179.425781 254.394531 179.613281 252.820312 C 179.820312 250.945312 176.226562 250.300781 174.574219 250.082031 C 172.914062 249.871094 172.273438 248.71875 172.339844 248.296875 C 172.414062 247.855469 173.785156 247.277344 174.355469 247.789062 C 175.214844 248.566406 176.378906 249.460938 177.992188 248.882812 C 178.894531 248.566406 178.269531 247.179688 179.039062 246.714844 C 179.605469 246.371094 180.910156 247.285156 180.910156 247.285156 C 180.910156 247.285156 181.40625 247.066406 181.054688 245.417969 C 180.695312 243.761719 177.8125 243.476562 177.8125 243.476562 L 177.238281 242.253906 C 176.65625 241.039062 174.144531 241.683594 174.144531 241.683594 C 174.144531 241.683594 171.6875 242.980469 169.746094 243.835938 C 167.808594 244.699219 167.375 243.117188 167.375 243.117188 L 165.070312 238.160156 C 165.355469 237.800781 165.5 237.296875 167.515625 237.15625 C 169.527344 237.011719 169.679688 236.21875 169.679688 236.21875 C 164.132812 233.636719 161.328125 229.828125 157.007812 222.855469 C 152.6875 215.894531 155.132812 205.90625 155.132812 205.90625 L 161.109375 225.089844 C 161.109375 225.089844 163.128906 229.976562 166.800781 228.53125 C 170.46875 227.097656 169.390625 223.363281 169.390625 223.363281 L 162.726562 201.085938 C 162.726562 201.085938 162.722656 201.078125 162.714844 201.039062 C 163.445312 200.851562 164.191406 200.636719 164.941406 200.410156 L 175.941406 236.945312 C 175.941406 236.945312 177.484375 241.472656 181.304688 240.175781 C 185.117188 238.886719 183.929688 234.925781 183.929688 234.925781 L 172.746094 197.539062 C 173.382812 197.269531 174.019531 196.976562 174.664062 196.675781 C 174.671875 196.691406 174.675781 196.707031 174.675781 196.707031 L 185.222656 230.617188 C 185.222656 230.617188 186.871094 235.203125 190.546875 233.921875 C 194.660156 232.496094 193.359375 228.605469 193.359375 228.605469 L 182.234375 192.542969 C 182.234375 192.542969 182.230469 192.542969 182.230469 192.535156 C 182.941406 192.085938 183.65625 191.636719 184.367188 191.15625 C 184.578125 191.375 184.640625 191.621094 184.640625 191.621094 L 193.085938 218.941406 C 193.085938 218.941406 194.390625 222.824219 198.425781 221.488281 C 201.492188 220.484375 200.863281 216.839844 200.863281 216.839844 Z M 88.417969 217.46875 C 88.417969 217.46875 87.75 219.652344 86.488281 219.050781 C 85.238281 218.445312 86.171875 216.644531 86.171875 216.644531 C 86.171875 216.644531 95.890625 191.695312 96.863281 189.265625 C 97.550781 189.769531 98.25 190.257812 98.9375 190.730469 Z M 96.199219 229.273438 C 96.199219 229.273438 95.578125 231.476562 94.3125 230.90625 C 93.042969 230.34375 93.933594 228.515625 93.933594 228.515625 C 93.933594 228.515625 104.382812 199.644531 106.0625 195.054688 C 106.808594 195.445312 107.550781 195.828125 108.28125 196.1875 Z M 105.414062 235.976562 C 105.414062 235.976562 104.824219 238.1875 103.554688 237.625 C 102.277344 237.078125 103.144531 235.242188 103.144531 235.242188 C 103.144531 235.242188 113.78125 204.8125 115.71875 199.316406 C 116.503906 199.59375 117.292969 199.863281 118.066406 200.109375 Z M 121.960938 224.097656 C 121.960938 224.097656 121.472656 226.320312 120.167969 225.824219 C 118.875 225.320312 119.667969 223.460938 119.667969 223.460938 C 119.667969 223.460938 124.730469 206.515625 126.070312 202.097656 C 126.921875 202.261719 127.742188 202.390625 128.539062 202.503906 Z M 140.324219 160.855469 C 139.300781 160.808594 138.378906 159.78125 138.378906 159.78125 C 138.378906 159.78125 138.921875 158.761719 140.273438 158.808594 C 141.621094 158.867188 142.21875 159.78125 142.21875 159.78125 C 142.21875 159.78125 141.351562 160.914062 140.324219 160.855469 Z M 166.292969 223.507812 C 166.292969 223.507812 167.082031 225.375 165.792969 225.882812 C 164.492188 226.371094 163.992188 224.152344 163.992188 224.152344 L 157.328125 202.886719 C 157.328125 202.886719 157.175781 202.621094 157.410156 202.210938 C 158.113281 202.089844 158.835938 201.941406 159.582031 201.789062 C 160.007812 203.085938 166.292969 223.507812 166.292969 223.507812 Z M 181.054688 235.144531 C 181.054688 235.144531 181.84375 237.011719 180.546875 237.515625 C 179.246094 238.023438 178.753906 235.789062 178.753906 235.789062 L 167.535156 199.578125 C 168.308594 199.316406 169.082031 199.03125 169.863281 198.730469 C 171.085938 202.621094 181.054688 235.144531 181.054688 235.144531 Z M 190.332031 228.679688 C 190.332031 228.679688 191.125 230.546875 189.832031 231.050781 C 188.539062 231.558594 188.03125 229.324219 188.03125 229.324219 L 177.46875 195.273438 C 178.203125 194.890625 178.941406 194.484375 179.683594 194.066406 C 180.414062 196.359375 190.332031 228.679688 190.332031 228.679688 Z M 197.386719 218.835938 C 196.097656 219.34375 195.589844 217.109375 195.589844 217.109375 L 187.042969 189.28125 C 187.738281 188.773438 188.4375 188.246094 189.136719 187.699219 C 189.140625 187.714844 189.148438 187.722656 189.148438 187.730469 C 189.378906 188.398438 197.894531 216.464844 197.894531 216.464844 C 197.894531 216.464844 198.683594 218.332031 197.386719 218.835938 Z M 197.386719 218.835938 '/%3E %3C/g%3E %3C/svg%3E")` },
'Egypt': { continent: 'Africa', flag: '🇪🇬', rank: 1, code: 'EGY', colorOverride: '#D4AF37' },
'South Africa': { bgPosition: '0px -15px', continent: 'Africa', flag: '🇿🇦', rank: 2, code: 'RSA', color_hex: '#000000', dividerClass: 'border-black', topBlockClass: '!bg-black' },
'Ghana': { continent: 'Africa', flag: '🇬🇭', rank: 3, code: 'GHA', colorOverride: '#FF6600' },
'Morocco': { continent: 'Africa', flag: '🇲🇦', rank: 4, code: 'MAR', colorOverride: '#006233' },
'Senegal': { continent: 'Africa', flag: '🇸🇳', rank: 5, code: 'SEN', colorOverride: '#C0C0C0' },
'Japan': { continent: 'Asia & Oceania', flag: '🇯🇵', rank: 1, code: 'JPN', colorOverride: '#C71585' },
'South Korea': { continent: 'Asia & Oceania', flag: '🇰🇷', rank: 2, code: 'KOR', colorOverride: '#FFB6C1' },
'New Zealand': { continent: 'Asia & Oceania', flag: '🇳🇿', rank: 3, code: 'NZL', colorOverride: '#D8BFD8' },
'Australia': { continent: 'Asia & Oceania', flag: '🇦🇺', rank: 4, code: 'AUS', colorOverride: '#800080' },
'Uzbekistan': { continent: 'Asia & Oceania', flag: '🇺🇿', rank: 5, code: 'UZB', colorOverride: '#008080' },
};
const CONTINENT_ORDER = ['America', 'Europe', 'Africa', 'Asia & Oceania'];

export default function CampPointsTracker() {
    const [teams, setTeams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeView, setActiveView] = useState('main'); // 'main', 'podium', 'continents'

    useEffect(() => {
        fetchTeams();

        const subscription = supabase
            .channel('public:camp_teams')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'camp_teams' }, payload => {
                if (payload.eventType === 'UPDATE') {
                    setTeams(current => current.map(t => t.id === payload.new.id ? payload.new : t));
                } else if (payload.eventType === 'INSERT') {
                    setTeams(current => [...current, payload.new]);
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, []);

    const fetchTeams = async () => {
        try {
            const { data, error } = await supabase
                .from('camp_teams')
                .select('*')
                .order('id', { ascending: true });

            if (error) throw error;
            if (data) setTeams(data);
        } catch (error) {
            console.error('Error fetching teams:', error);
        } finally {
            setLoading(false);
        }
    };

    const updatePoints = async (id, currentPoints, increment) => {
        const newPoints = currentPoints + increment;
        
        setTeams(current => current.map(t => t.id === id ? { ...t, points: newPoints } : t));

        try {
            const { error } = await supabase
                .from('camp_teams')
                .update({ points: newPoints })
                .eq('id', id);

            if (error) {
                console.error("Failed to update", error);
                setTeams(current => current.map(t => t.id === id ? { ...t, points: currentPoints } : t));
            }
        } catch (error) {
            console.error('Error updating points:', error);
        }
    };

    if (loading) {
        return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white font-black text-2xl">LOADING WORLD CUP...</div>;
    }

    // Process teams with metadata
    const enrichedTeams = teams.map(team => ({
        ...team,
        color_hex: TEAM_META[team.name]?.colorOverride || team.color_hex,
        continent: TEAM_META[team.name]?.continent || 'Other',
        flag: TEAM_META[team.name]?.flag || '🏴',
        rank: TEAM_META[team.name]?.rank || 99,
        bgStyle: TEAM_META[team.name]?.bgStyle || null,
        bgPosition: TEAM_META[team.name]?.bgPosition || '0px 0px',
        code: TEAM_META[team.name]?.code || team.name.substring(0, 3).toUpperCase(),
        cups: TEAM_META[team.name]?.cups || 0,
        topBlockStyle: TEAM_META[team.name]?.topBlockStyle || null,
        dividerClass: TEAM_META[team.name]?.dividerClass || null,
        glassClass: TEAM_META[team.name]?.glassClass || null
    }));

    // Group by continent and sort inside group by historical rank
    const groupedTeams = CONTINENT_ORDER.map(continent => ({
        name: continent,
        teams: enrichedTeams.filter(t => t.continent === continent).sort((a, b) => a.rank - b.rank)
    })).filter(g => g.teams.length > 0);

    // Sorted for Leaderboard
    const sortedTeams = [...enrichedTeams].sort((a, b) => b.points - a.points);

    const maxPoints = Math.max(80, ...teams.map(t => t.points));

    return (
        <div className="fixed inset-0 bg-slate-800 z-[100] flex flex-col font-sans overflow-hidden text-slate-100">
            {/* Header */}
            <div className="h-20 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-10 shadow-2xl shrink-0 z-10">
                <div className="flex items-center gap-4">
                    <Trophy size={36} className="text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]" />
                    <h1 className="text-4xl font-black text-white tracking-widest uppercase" style={{ textShadow: '0 4px 15px rgba(0,0,0,0.8)'}}>
                        WORLD CUP <span className="text-primary-500">2026</span>
                    </h1>
                </div>
                <div className="flex items-center gap-6">
                    <div className="flex items-center bg-slate-900/80 rounded-xl p-1.5 border border-slate-700/50 shadow-inner">
                        <button 
                            onClick={() => setActiveView('main')} 
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-black uppercase tracking-widest transition-all duration-300 ${activeView === 'main' ? 'bg-indigo-600 text-white shadow-lg scale-105' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            <Trophy size={16} /> Tracks
                        </button>
                        <button 
                            onClick={() => setActiveView('podium')} 
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-black uppercase tracking-widest transition-all duration-300 ${activeView === 'podium' ? 'bg-amber-600 text-white shadow-lg scale-105' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            <Presentation size={16} /> Podium
                        </button>
                        <button 
                            onClick={() => setActiveView('continents')} 
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-black uppercase tracking-widest transition-all duration-300 ${activeView === 'continents' ? 'bg-emerald-600 text-white shadow-lg scale-105' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            <BarChart3 size={16} /> Continents
                        </button>
                    </div>

                    <div className="text-slate-400 font-black uppercase tracking-widest text-lg flex items-center gap-2">
                        <Globe2 size={24} /> SKD 2026 Summer Camp
                    </div>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                
                {activeView === 'main' && (
                    <>
                        {/* Main Tracks Area (Left Side) */}
                        <div className="flex-1 flex p-2 md:p-4 gap-2 md:gap-4 lg:gap-6 overflow-hidden min-w-0">
                    {groupedTeams.map((group, gIdx) => (
                        <div key={gIdx} className="flex-1 min-w-0 flex flex-col bg-slate-700/50 rounded-lg md:rounded-2xl border border-slate-800/80 overflow-hidden shadow-2xl relative">
                            {/* Group Header */}
                            <div className="bg-slate-800/80 py-1.5 md:py-3 text-center border-b border-slate-700/50 shadow-md z-10 shrink-0">
                                <h2 className="font-black text-xs md:text-sm lg:text-xl uppercase tracking-widest text-white drop-shadow-md truncate px-1">
                                    {group.name}
                                </h2>
                            </div>
                            
                            {/* Group Tracks */}
                            <div className="flex-1 flex p-1 md:p-2 gap-1 md:gap-2 h-full min-w-0">
                                {group.teams.map((team) => {
                                    const heightPercentage = Math.max(0, Math.min(100, (team.points / maxPoints) * 100));
                                    
                                    return (
                                        <div key={team.id} className="flex-1 min-w-0 flex flex-col items-center group relative">
                                            
                                            {/* Track Background */}
                                            <div className="w-full flex-1 bg-slate-800/50 rounded-t-md md:rounded-t-xl relative flex flex-col justify-end overflow-hidden border border-slate-800/50">
                                                
                                                {/* Fill Bar */}
                                                <div 
                                                    className="absolute inset-x-0 bottom-0 w-full transition-all duration-1000 ease-[cubic-bezier(0.34,1.56,0.64,1)] flex flex-col justify-start rounded-t-sm md:rounded-t-lg overflow-hidden"
                                                    style={{ 
                                                        height: `${heightPercentage}%`, 
                                                        boxShadow: team.bgStyle ? `0 0 30px rgba(255,255,255,0.2) inset, 0 -10px 20px rgba(10,49,97,0.5)` : `0 0 30px ${team.color_hex}60 inset, 0 -10px 20px ${team.color_hex}80`
                                                    }}
                                                >
                                                    <div 
                                                        className={`w-full shrink-0 h-1 sm:h-2 md:h-3 lg:h-4 border-b-[3px] shadow-xl z-10 relative ${team.dividerClass || 'border-white/30'} ${team.topBlockClass || ''}`} 
                                                        style={team.topBlockStyle || { backgroundColor: team.color_hex }}
                                                    />
                                                    {/* Track Background */}
                                                    <div className="flex-1 w-full relative flex flex-col overflow-hidden" style={{ backgroundColor: team.color_hex }}>
                                                        <div className={`w-full shrink-0 h-[2px] sm:h-1 md:h-2 lg:h-3 backdrop-blur-md border-b z-20 ${team.glassClass || 'bg-white/20 border-white/40'}`} />
                                                        <div className="flex-1 w-full relative" style={{ background: team.bgStyle ? team.bgStyle : 'transparent', backgroundPosition: team.bgPosition }} />
                                                    </div>
                                                </div>

                                                {/* Floating Score Label */}
                                                <div 
                                                    className="absolute w-full text-center transition-all duration-1000 ease-[cubic-bezier(0.34,1.56,0.64,1)] pb-2 md:pb-4 z-10"
                                                    style={{ bottom: `${heightPercentage}%` }}
                                                >
                                                    <span className="text-base sm:text-xl md:text-3xl lg:text-4xl font-black text-white block mb-1 drop-shadow-[0_4px_10px_rgba(0,0,0,0.9)] px-0.5">
                                                        {team.points}
                                                    </span>
                                                </div>

                                                {/* Reimagined Floating Controls */}
                                                <div className="absolute top-2 md:top-8 right-1/2 translate-x-1/2 flex flex-col gap-2 md:gap-4 opacity-0 group-hover:opacity-100 transition-opacity z-50">
                                                    <button 
                                                        onClick={() => updatePoints(team.id, team.points, 1)}
                                                        className="w-8 h-8 md:w-12 md:h-12 rounded-full bg-emerald-500/90 hover:bg-emerald-400 text-white flex items-center justify-center shadow-lg backdrop-blur-md transition-transform hover:scale-110"
                                                    >
                                                        <Plus size={24} />
                                                    </button>
                                                    <button 
                                                        onClick={() => updatePoints(team.id, team.points, -1)}
                                                        className="w-8 h-8 md:w-12 md:h-12 rounded-full bg-red-500/90 hover:bg-red-400 text-white flex items-center justify-center shadow-lg backdrop-blur-md transition-transform hover:scale-110"
                                                    >
                                                        <Minus size={24} />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Team Base Box */}
                                            <div className="w-full h-16 md:h-20 lg:h-28 shrink-0 bg-slate-800 border-x border-b border-slate-700 flex flex-col items-center p-1 sm:p-2 rounded-b-md md:rounded-b-xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] relative z-20">
                                                <div className="text-xl md:text-3xl lg:text-4xl mb-0.5 md:mb-1 drop-shadow-md -mt-4 md:-mt-6 lg:-mt-8 bg-slate-800 rounded-full w-8 h-8 md:w-12 md:h-12 lg:w-14 lg:h-14 flex items-center justify-center border-2 md:border-4 border-slate-700 shrink-0 z-30 relative">{team.flag}</div>
                                                
                                                {/* Stars for World Cups */}
                                                <div className="flex justify-center gap-[1px] md:gap-0.5 min-h-[10px] md:min-h-[14px]">
                                                    {team.cups > 0 && [...Array(team.cups)].map((_, i) => (
                                                        <span key={i} className="text-yellow-400 text-[6px] md:text-[8px] lg:text-[10px] leading-none drop-shadow-md">★</span>
                                                    ))}
                                                </div>

                                                <div className="flex-1 w-full flex items-center justify-center overflow-hidden">
                                                    <h3 className="text-white font-black text-[8px] sm:text-[10px] md:text-xs lg:text-sm uppercase text-center leading-none tracking-tight">
                                                        {team.code}
                                                    </h3>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Leaderboard Panel (Right Side) */}
                <div className="w-48 md:w-64 lg:w-80 xl:w-[400px] shrink-0 bg-slate-900/80 backdrop-blur-xl border-l border-slate-800 flex flex-col shadow-[-10px_0_30px_rgba(0,0,0,0.5)] z-20 relative min-w-0">
                    <div className="p-3 md:p-4 lg:p-6 border-b border-slate-800 bg-slate-800/30 shrink-0">
                        <h2 className="font-black text-sm md:text-lg lg:text-2xl uppercase tracking-widest text-white flex items-center gap-2 lg:gap-3 truncate">
                            <Medal className="text-yellow-400 shrink-0" size={20} />
                            Standings
                        </h2>
                    </div>
                    
                    <div className="flex-1 overflow-hidden p-3 pt-1">
                        <div className="flex flex-col h-full gap-1">
                            {sortedTeams.map((team, index) => {
                                // Assign distinct styling for top 3
                                let rankStyle = "bg-slate-800/80 border-slate-700/50 text-slate-300";
                                let rankNumStyle = "text-slate-500";
                                
                                if (index === 0) {
                                    rankStyle = "bg-yellow-500/10 border-yellow-500/40 text-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.1)]";
                                    rankNumStyle = "text-yellow-400 text-lg sm:text-xl";
                                } else if (index === 1) {
                                    rankStyle = "bg-slate-300/10 border-slate-400/40 text-slate-300 shadow-[0_0_10px_rgba(203,213,225,0.05)]";
                                    rankNumStyle = "text-slate-300 text-base sm:text-lg";
                                } else if (index === 2) {
                                    rankStyle = "bg-amber-700/10 border-amber-600/40 text-amber-500 shadow-[0_0_10px_rgba(180,83,9,0.05)]";
                                    rankNumStyle = "text-amber-500 text-base sm:text-lg";
                                }

                                return (
                                    <div 
                                        key={team.id}
                                        className="flex-1 min-h-0 relative transition-all duration-700 ease-in-out flex"
                                    >
                                        <div className={`flex-1 flex items-center gap-1 md:gap-2 lg:gap-3 px-1 md:px-2 lg:px-3 py-0.5 md:py-1 lg:py-2 rounded-md lg:rounded-xl border transition-colors ${rankStyle} min-w-0`}>
                                            <div className={`w-4 md:w-6 font-black text-center text-xs md:text-base lg:text-lg shrink-0 ${rankNumStyle.replace('text-lg sm:text-xl', '').replace('text-base sm:text-lg', '')}`}>
                                                {index + 1}
                                            </div>
                                            <div className="text-sm md:text-lg lg:text-xl drop-shadow-md w-4 md:w-6 text-center shrink-0">{team.flag}</div>
                                            <div className="flex-1 font-bold text-[10px] md:text-xs lg:text-sm tracking-wide truncate min-w-0">{team.name}</div>
                                            <div className="font-black text-xs md:text-lg lg:text-xl w-8 md:w-10 lg:w-12 text-right drop-shadow-md shrink-0">
                                                {team.points}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
                </>
                )}

                {activeView === 'podium' && <PodiumView teams={enrichedTeams} />}
                {activeView === 'continents' && <ContinentStatsView teams={enrichedTeams} />}
            </div>
        </div>
    );
}

// --- NEW WIDGET VIEWS ---

function PodiumView({ teams }) {
    const sorted = [...teams].sort((a, b) => b.points - a.points);
    const top3 = sorted.slice(0, 3);
    if (top3.length < 3) return null;

    const [first, second, third] = top3;

    const renderPodiumStep = (team, place, height, color, delay) => (
        <div className="flex flex-col items-center justify-end relative group w-48 md:w-64 lg:w-80">
            {/* Floating Score */}
            <div className={`absolute w-full text-center transition-all duration-1000 animate-bounce ${color.text}`} style={{ bottom: `${height + 20}px` }}>
                <span className="text-4xl lg:text-6xl font-black drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]">{team.points}</span>
            </div>

            {/* Base Block */}
            <div 
                className="w-full flex flex-col items-center justify-start rounded-t-2xl shadow-[0_-20px_50px_rgba(0,0,0,0.5)] border border-white/10 relative overflow-hidden transition-all duration-1000 ease-out"
                style={{ height: `${height}px`, background: color.bg }}
            >
                <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent opacity-50" />
                <div className="text-4xl lg:text-7xl drop-shadow-2xl mt-6 z-10">{team.flag}</div>
                <h3 className="text-white font-black text-xl lg:text-3xl uppercase tracking-widest mt-2 z-10 drop-shadow-md">{team.name}</h3>
                <div className={`text-6xl lg:text-9xl font-black opacity-20 absolute bottom-4 ${color.text}`}>{place}</div>
            </div>
        </div>
    );

    return (
        <div className="flex-1 flex items-end justify-center pb-20 p-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black relative">
            {/* Stage Floor */}
            <div className="absolute bottom-0 w-full h-32 bg-slate-900 border-t border-slate-800" style={{ transform: 'perspective(1000px) rotateX(60deg)', transformOrigin: 'bottom' }} />
            
            <div className="flex items-end justify-center gap-4 lg:gap-8 z-10">
                {/* 2nd Place */}
                {renderPodiumStep(second, "2", 250, { bg: 'linear-gradient(to bottom, #94a3b8, #475569)', text: 'text-slate-300' })}
                
                {/* 1st Place */}
                {renderPodiumStep(first, "1", 400, { bg: 'linear-gradient(to bottom, #eab308, #a16207)', text: 'text-yellow-400' })}
                
                {/* 3rd Place */}
                {renderPodiumStep(third, "3", 180, { bg: 'linear-gradient(to bottom, #b45309, #78350f)', text: 'text-amber-600' })}
            </div>
        </div>
    );
}

function ContinentStatsView({ teams }) {
    const continentTotals = CONTINENT_ORDER.map(cont => {
        const contTeams = teams.filter(t => t.continent === cont);
        const total = contTeams.reduce((sum, t) => sum + t.points, 0);
        return { name: cont, points: total, teamCount: contTeams.length };
    }).sort((a, b) => b.points - a.points);
    
    const maxPoints = Math.max(...continentTotals.map(c => c.points), 1);

    return (
        <div className="flex-1 flex flex-col p-10 lg:p-20 bg-slate-950 gap-10">
            <div className="text-center">
                <h1 className="text-5xl lg:text-7xl font-black text-white uppercase tracking-tighter drop-shadow-lg italic mb-4">Continent Wars</h1>
                <p className="text-slate-400 text-xl tracking-widest uppercase">Total Regional Dominance</p>
            </div>

            <div className="flex-1 flex items-end justify-center gap-8 lg:gap-16 pb-10">
                {continentTotals.map((cont, index) => {
                    const heightPercentage = Math.max(10, (cont.points / maxPoints) * 100);
                    const colors = [
                        'from-indigo-500 to-blue-700',
                        'from-emerald-500 to-teal-700',
                        'from-rose-500 to-red-700',
                        'from-amber-500 to-orange-700'
                    ];

                    return (
                        <div key={cont.name} className="flex-1 max-w-sm flex flex-col items-center group relative">
                            {/* Score Label */}
                            <div className="w-full text-center transition-all duration-1000 mb-6">
                                <span className="text-4xl lg:text-7xl font-black text-white block drop-shadow-[0_4px_10px_rgba(0,0,0,0.9)]">{cont.points}</span>
                            </div>

                            {/* Bar */}
                            <div 
                                className={`w-full bg-gradient-to-t ${colors[index]} rounded-t-2xl relative shadow-[0_0_40px_rgba(0,0,0,0.5)] border-x border-t border-white/20 transition-all duration-1000`}
                                style={{ height: `${heightPercentage}%` }}
                            >
                                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-t-2xl" />
                            </div>

                            {/* Base */}
                            <div className="w-full bg-slate-800 p-6 rounded-b-2xl border-x border-b border-slate-700 shadow-2xl flex flex-col items-center">
                                <Globe2 className="text-slate-500 mb-2" size={32} />
                                <h3 className="text-white font-black text-xl lg:text-2xl uppercase tracking-widest text-center leading-none">{cont.name}</h3>
                                <div className="text-slate-400 font-bold mt-2 text-sm">{cont.teamCount} TEAMS</div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
